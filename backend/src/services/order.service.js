import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';
import pushNotificationService from './pushNotification.service.js';

const computeFinalPrice = (basePrice, discountType, discountValue) => {
    if (basePrice === undefined || basePrice === null) return null;
    if (!discountType || discountValue === undefined || discountValue === null) {
        return Number(basePrice);
    }

    const base = Number(basePrice);
    const discount = Number(discountValue);
    if (Number.isNaN(base) || Number.isNaN(discount)) {
        return Number(basePrice);
    }

    const normalized = String(discountType).toLowerCase();
    if (normalized === 'percentage') {
        return Math.max(0, base - (base * discount) / 100);
    }
    if (normalized === 'flat') {
        return Math.max(0, base - discount);
    }

    return Number(basePrice);
};

const resolveEffectiveItemPrice = (item, variant = null) => {
    if (!item) return 0;

    if (variant === 'Half') {
        return Number(
            item.half_portion_final_price ??
            computeFinalPrice(item.half_portion_price, item.half_discount_type, item.half_discount_value) ??
            item.half_portion_price ??
            item.price ??
            0
        );
    }

    if (variant === 'Full') {
        const fullBase = item.full_price ?? item.price;
        return Number(
            item.full_final_price ??
            computeFinalPrice(fullBase, item.full_discount_type, item.full_discount_value) ??
            fullBase ??
            0
        );
    }

    return Number(
        item.final_price ??
        item.full_final_price ??
        computeFinalPrice(item.price, item.discount_type, item.discount_value) ??
        item.price ??
        0
    );
};

const normalizeRulesFromScalarFields = (row) => {
    const deliveryFee = Number(row?.delivery_fee) || 0;
    const freeDeliveryAbove = Number(row?.free_delivery_above) || 0;

    if (freeDeliveryAbove > 0) {
        return [
            { min: 0, max: Math.max(0, freeDeliveryAbove - 0.01), fee: deliveryFee },
            { min: freeDeliveryAbove, max: 999999, fee: 0 },
        ];
    }

    return [{ min: 0, max: 999999, fee: deliveryFee }];
};

const parseDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;
    // Ensure deadline is treated as UTC if it's missing timezone info
    if (typeof deadlineStr === 'string' && !deadlineStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(deadlineStr)) {
        return new Date(deadlineStr.replace(' ', 'T') + 'Z');
    }
    return new Date(deadlineStr);
};

export const orderService = {
    calculateDeliveryFee(total, rules) {
        if (!Array.isArray(rules) || rules.length === 0) return 0;

        const matched = rules.find((rule) => total >= Number(rule.min) && total <= Number(rule.max));
        return matched ? Number(matched.fee) || 0 : 0;
    },

    async getDeliveryRules() {
        // Priority 1: dynamic settings table
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('delivery_rules, delivery_fee, free_delivery_above')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                if (Array.isArray(data?.delivery_rules) && data.delivery_rules.length > 0) {
                    return data.delivery_rules;
                }

                return normalizeRulesFromScalarFields(data);
            }
        } catch (error) {
            logger.warn('Failed to read platform_settings from database', { error: error.message });
        }

        // Priority 2: JSON env fallback for production safety
        try {
            if (process.env.DELIVERY_RULES_JSON) {
                const parsed = JSON.parse(process.env.DELIVERY_RULES_JSON);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (error) {
            logger.warn('Invalid DELIVERY_RULES_JSON format', { error: error.message });
        }

        // No trusted rules source available
        return [{ min: 0, max: 999999, fee: Number(process.env.DELIVERY_FEE || 0) }];
    },

    async getCheckoutChargeSettings() {
        // Priority 1: dynamic settings table
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('delivery_rules, delivery_fee, free_delivery_above, convenience_fee')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                const deliveryRules = Array.isArray(data?.delivery_rules) && data.delivery_rules.length > 0
                    ? data.delivery_rules
                    : normalizeRulesFromScalarFields(data);
                return {
                    deliveryRules,
                    convenienceFee: Number(data?.convenience_fee) || 0,
                    source: 'database',
                };
            }
        } catch (error) {
            logger.warn('Failed to read checkout charge settings from database', { error: error.message });
        }

        // Priority 2: JSON env fallback for production safety
        try {
            if (process.env.DELIVERY_RULES_JSON) {
                const parsed = JSON.parse(process.env.DELIVERY_RULES_JSON);
                if (Array.isArray(parsed)) {
                    return {
                        deliveryRules: parsed,
                        convenienceFee: Number(process.env.CONVENIENCE_FEE || 0),
                        source: 'env_json',
                    };
                }
            }
        } catch (error) {
            logger.warn('Invalid DELIVERY_RULES_JSON format', { error: error.message });
        }

        const fallbackDeliveryFee = Number(process.env.DELIVERY_FEE || 0);
        const fallbackFreeDeliveryAbove = Number(process.env.FREE_DELIVERY_ABOVE || 0);
        const fallbackConvenienceFee = Number(process.env.CONVENIENCE_FEE || 0);

        const fallbackDeliveryRules = fallbackFreeDeliveryAbove > 0
            ? [
                { min: 0, max: Math.max(0, fallbackFreeDeliveryAbove - 0.01), fee: fallbackDeliveryFee },
                { min: fallbackFreeDeliveryAbove, max: 999999, fee: 0 },
            ]
            : [{ min: 0, max: 999999, fee: fallbackDeliveryFee }];

        logger.warn('Checkout charge settings missing in DB/env JSON, using safe defaults', {
            fallbackDeliveryFee,
            fallbackFreeDeliveryAbove,
            fallbackConvenienceFee,
        });

        return {
            deliveryRules: fallbackDeliveryRules,
            convenienceFee: fallbackConvenienceFee,
            source: 'defaults',
        };
    },

    /**
     * Process Checkout
     */
    async checkout(customerId, addressData, clientPricing = {}) {
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
                        id, shop_id, name, price, final_price, discount_type, discount_value, half_portion_price, half_portion_final_price, half_discount_type, half_discount_value, full_price, full_final_price, full_discount_type, full_discount_value, has_variants, is_available, stock_quantity,
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

            // STEP 4: Recalculate from server-side trusted data
            let subtotal = 0;
            for (const ci of cartItems) {
                const unitPrice = resolveEffectiveItemPrice(ci.items, ci.variant);
                
                subtotal += (ci.quantity * unitPrice);
            }

            const { deliveryRules, convenienceFee, source } = await this.getCheckoutChargeSettings();

            let deliveryCharge = this.calculateDeliveryFee(subtotal, deliveryRules);
            let handlingCharge = convenienceFee;

            const clientDeliveryFee = Number(clientPricing?.deliveryFee);
            const clientConvenienceFee = Number(clientPricing?.convenienceFee);

            // If server settings are unavailable, rely on client-provided computed charges
            // to avoid unintentionally creating zero-fee orders.
            if (source === 'defaults') {
                if (Number.isFinite(clientDeliveryFee) && clientDeliveryFee >= 0) {
                    deliveryCharge = clientDeliveryFee;
                }
                if (Number.isFinite(clientConvenienceFee) && clientConvenienceFee >= 0) {
                    handlingCharge = clientConvenienceFee;
                }
            }

            const totalAmount = subtotal + deliveryCharge + handlingCharge;

            // Log mismatch for fraud/telemetry; backend values are authoritative.
            const clientSubtotal = Number(clientPricing?.subtotal);
            const clientFinalAmount = Number(clientPricing?.finalAmount);

            if (
                Number.isFinite(clientSubtotal) &&
                Number.isFinite(clientDeliveryFee) &&
                Number.isFinite(clientFinalAmount)
            ) {
                const subtotalDiff = Math.abs(clientSubtotal - subtotal);
                const feeDiff = Math.abs(clientDeliveryFee - deliveryCharge);
                const convenienceFeeDiff = Number.isFinite(clientConvenienceFee)
                    ? Math.abs(clientConvenienceFee - handlingCharge)
                    : 0;
                const finalDiff = Math.abs(clientFinalAmount - totalAmount);

                if (subtotalDiff > 0.01 || feeDiff > 0.01 || convenienceFeeDiff > 0.01 || finalDiff > 0.01) {
                    logger.warn('Checkout pricing mismatch detected; using backend totals', {
                        customerId,
                        backend: { subtotal, deliveryCharge, totalAmount },
                        client: {
                            subtotal: clientSubtotal,
                            deliveryFee: clientDeliveryFee,
                            convenienceFee: clientConvenienceFee,
                            finalAmount: clientFinalAmount,
                        },
                    });
                }
            }

            // STEP 5: Generate order_number
            const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = `BZ-${datePart}-${randomPart}`;

            // STEP 6: Insert into orders
            const now = new Date();
            let acceptance_deadline = new Date(now.getTime() + 5 * 60 * 1000);
            // Fallback: if for any reason acceptance_deadline is not set, set it to 5 min from now
            if (!acceptance_deadline || isNaN(acceptance_deadline.getTime())) {
                acceptance_deadline = new Date(Date.now() + 5 * 60 * 1000);
            }
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
                payment_status: 'pending',
                acceptance_deadline: acceptance_deadline.toISOString(),
            };

            // Validation: acceptance_deadline must be defined
            if (!orderData.acceptance_deadline) {
                throw new Error('acceptance_deadline must be set for new orders');
            }

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
                const unitPrice = resolveEffectiveItemPrice(ci.items, ci.variant);
                
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

            try {
                await pushNotificationService.sendOrderStatusNotification({
                    customer_id: customerId,
                    shop_id: shopId,
                    status: 'placed',
                    reference_id: newOrder.id,
                });
            } catch (notificationError) {
                logger.error('Failed to send order placed notification', {
                    error: notificationError.message,
                    orderId: newOrder.id,
                    customerId,
                });
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
            .select(`
                id, 
                order_number, 
                shop_id, 
                total_amount, 
                status, 
                created_at, 
                acceptance_deadline,
                shops ( name ),
                order_items ( id, item_name, quantity, item_price )
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching customer orders', { error });
            throw new Error('Failed to fetch orders');
        }

        // Expiry enforcement
        const now = new Date();
        for (const order of data || []) {
            const deadline = parseDeadline(order.acceptance_deadline);
            if (order.status === 'pending' && deadline && deadline < now) {
                await supabase.from('orders').update({ status: 'expired' }).eq('id', order.id);
                order.status = 'expired';
            }
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
           shops (
             name,
             address,
             phone
           ),
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

        // Expiry enforcement
        const now = new Date();
        if (order && order.status === 'pending' && order.acceptance_deadline) {
            const deadline = parseDeadline(order.acceptance_deadline);
            logger.info(`Checking expiry for order ${order.id}: now=${now.toISOString()}, deadline=${deadline ? deadline.toISOString() : 'null'}, isExpired=${deadline ? deadline < now : 'false'}`);
            if (deadline && deadline < now) {
                await supabase.from('orders').update({ status: 'expired' }).eq('id', order.id);
                order.status = 'expired';
            }
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
