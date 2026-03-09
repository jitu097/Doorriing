import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

export const orderService = {
    /**
     * Process Checkout
     */
    async checkout(customerId, addressData) {
        try {
            // STEP 1: Fetch cart by customer_id
            const { data: cart, error: cartError } = await supabase
                .from('carts')
                .select('*')
                .eq('customer_id', customerId)
                .maybeSingle();

            if (cartError) {
                console.error('[CRITICAL] Fetch cart error:', cartError);
                throw new Error(`Database error fetching cart: ${cartError.message}`);
            }
            if (!cart) throw new Error('No cart found');

            // STEP 2: Fetch cart_items joined with items
            const { data: cartItems, error: itemsError } = await supabase
                .from('cart_items')
                .select(`
          id, quantity, variant,
          items!inner (
            id, shop_id, name, price, half_portion_price, full_price, has_variants, is_available, stock_quantity,
            shops!inner ( id, is_active, business_type )
          )
        `)
                .eq('cart_id', cart.id);

            if (itemsError) {
                console.error('[CRITICAL] Fetch cart items error:', itemsError);
                throw new Error(`Failed to fetch cart items: ${itemsError.message}`);
            }
            if (!cartItems || cartItems.length === 0) throw new Error('Cart empty');

            // Validate items
            const shopId = cart.shop_id || cartItems[0].items.shop_id;
            const isRestaurant = cartItems[0]?.items?.shops?.business_type === 'restaurant';

            for (const ci of cartItems) {
                if (!ci.items) throw new Error(`Item ${ci.item_id} validation failed: does not exist`);
                if (!ci.items.is_available) throw new Error(`Item validation failed: ${ci.items.name} is not available`);
                // Only check stock for grocery items, not restaurants
                if (!isRestaurant && ci.items.stock_quantity !== null && ci.items.stock_quantity < ci.quantity) {
                    throw new Error(`Item validation failed: insufficient stock for ${ci.items.name}`);
                }
                if (!ci.items.shops.is_active) {
                    throw new Error(`Item validation failed: shop is currently closed`);
                }
            }

            // STEP 3: Handle address
            let deliveryAddressStr = '';
            if (typeof addressData === 'string' && addressData.length > 30) {
                // UUID checks or direct string fallback
                if (!addressData.includes('-')) {
                    deliveryAddressStr = addressData;
                }
            } else if (typeof addressData === 'object') {
                deliveryAddressStr = `${addressData.building}, ${addressData.area}, ${addressData.landmark ? addressData.landmark + ', ' : ''}Phone: ${addressData.phone}`;
            }

            // If it's an ID, fetch it
            if (!deliveryAddressStr && typeof addressData === 'string' && addressData.includes('-')) {
                const { data: addressObj, error: addrError } = await supabase
                    .from('customer_addresses')
                    .select('*')
                    .eq('id', addressData)
                    .eq('customer_id', customerId)
                    .maybeSingle();

                if (addrError || !addressObj) throw new Error('Failed to fetch address or unauthorized');

                const parts = [
                    addressObj.address_line_1,
                    addressObj.address_line_2,
                    addressObj.landmark
                ].filter(Boolean);
                deliveryAddressStr = `${addressObj.address_type || 'Home'}: ${parts.join(', ')}`;
            }

            if (!deliveryAddressStr) {
                throw new Error('Invalid delivery address');
            }

            // STEP 4: Recalculate (same as checkout page)
            let subtotal = 0;
            for (const ci of cartItems) {
                // Determine correct price based on variant
                let unitPrice = Number(ci.items.price) || 0;
                
                if (ci.variant === 'Half' && ci.items.half_portion_price != null) {
                    unitPrice = Number(ci.items.half_portion_price);
                } else if (ci.variant === 'Full' && ci.items.full_price != null) {
                    unitPrice = Number(ci.items.full_price);
                }
                
                subtotal += (ci.quantity * unitPrice);
            }
            const deliveryCharge = 20;  // Fixed delivery charge
            const handlingCharge = 2;   // Fixed handling charge
            const totalAmount = subtotal + deliveryCharge + handlingCharge;

            // STEP 5: Generate order_number
            const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = `BZ-${datePart}-${randomPart}`;

            // STEP 6: Insert into orders
            const orderData = {
                shop_id: shopId,
                customer_id: customerId,
                order_number: orderNumber,
                customer_name: 'Customer', // Derived or default, table needs it based on schema
                customer_phone: 'N/A', // Derived or default
                delivery_address: deliveryAddressStr,
                items_total: subtotal,
                delivery_charge: deliveryCharge,
                handling_charge: handlingCharge,
                total_amount: totalAmount,
                status: 'pending',
                payment_method: 'cod',
                payment_status: 'pending'
            };

            const { data: newOrder, error: orderInsertError } = await supabase
                .from('orders')
                .insert(orderData)
                .select('*')
                .single();

            if (orderInsertError) {
                console.error('[CRITICAL] Failed to insert new order:', orderInsertError);
                throw new Error(`Failed to create order: ${orderInsertError.message}`);
            }

            // Rollback handling array
            const rollbackOrder = async () => {
                await supabase.from('orders').delete().eq('id', newOrder.id);
            };

            // STEP 7: Insert into order_items
            const orderItemsToInsert = cartItems.map(ci => {
                // Determine correct price based on variant (same logic as subtotal)
                let unitPrice = Number(ci.items.price) || 0;
                
                if (ci.variant === 'Half' && ci.items.half_portion_price != null) {
                    unitPrice = Number(ci.items.half_portion_price);
                } else if (ci.variant === 'Full' && ci.items.full_price != null) {
                    unitPrice = Number(ci.items.full_price);
                }
                
                return {
                    order_id: newOrder.id,
                    item_id: ci.items.id,
                    item_name: ci.items.name,
                    quantity: ci.quantity,
                    item_price: unitPrice,
                    subtotal: unitPrice * ci.quantity
                };
            });

            const { error: oiInsertError } = await supabase
                .from('order_items')
                .insert(orderItemsToInsert);

            if (oiInsertError) {
                console.error('[CRITICAL] Failed to insert order items:', oiInsertError);
                await rollbackOrder();
                throw new Error(`Failed to create order items: ${oiInsertError.message}`);
            }

            // STEP 8: Clear cart
            const { error: clearCartError } = await supabase
                .from('carts')
                .delete()
                .eq('id', cart.id);

            if (clearCartError) {
                logger.warn('Failed to clear cart after order placement', { cartId: cart.id, orderId: newOrder.id });
            }

            // STEP 9: Return full response
            return {
                order: newOrder,
                items: orderItemsToInsert
            };

        } catch (error) {
            logger.error('Order checkout service exception', { error: error.message });
            throw error;
        }
    },

    /**
     * Get Customer Orders
     */
    async getOrders(customerId) {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, shop_id, total_amount, status, created_at')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching customer orders', { error });
            throw new Error('Failed to fetch orders');
        }

        return data || [];
    },

    /**
     * Get Order Details
     */
    async getOrderById(customerId, orderId) {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
           *,
           order_items (
             id, item_id, item_name, quantity, item_price, subtotal
           )
        `)
            .eq('id', orderId)
            .eq('customer_id', customerId)
            .maybeSingle();

        if (error) {
            logger.error('Error fetching order details', { error, orderId });
            throw new Error('Failed to fetch order details');
        }

        return order;
    },

    /**
     * Cancel Order
     */
    async cancelOrder(customerId, orderId) {
        // First get order
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, status, customer_id')
            .eq('id', orderId)
            .maybeSingle();

        if (fetchError || !order) {
            throw new Error('Order not found');
        }

        if (order.customer_id !== customerId) {
            throw new Error('Customer does not own this order');
        }

        if (order.status !== 'pending') {
            throw new Error(`Cannot cancel order in ${order.status} state`);
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);

        if (updateError) {
            logger.error('Error cancelling order', { updateError });
            throw new Error('Failed to update order status');
        }
    }
};
