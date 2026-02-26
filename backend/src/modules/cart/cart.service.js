import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import itemService from '../item/item.service.js';

class CartService {
  /**
   * Get or create active cart for customer and shop
   * Handles shop switching by clearing cart if customer tries to add from different shop
   */
  async getOrCreateCart(customerId, shopId) {
    try {
      // Check if customer has ANY cart (due to UNIQUE constraint on customer_id)
      const { data: existingCart, error: fetchError } = await supabase
        .from('carts')
        .select('id, customer_id, shop_id, updated_at')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Failed to fetch cart', { error: fetchError, customerId });
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (existingCart) {
        // Cart exists - check if it's for the same shop
        if (existingCart.shop_id === shopId) {
          // Same shop - return existing cart
          logger.info('[CART] Using existing cart', { 
            cartId: existingCart.id, 
            customerId, 
            shopId 
          });
          return existingCart;
        } else {
          // Different shop - clear old cart and create new one
          logger.info('[CART] Shop changed, clearing old cart', {
            oldCartId: existingCart.id,
            oldShopId: existingCart.shop_id,
            newShopId: shopId
          });

          // Delete cart_items first (due to foreign key)
          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', existingCart.id);

          // Update existing cart to new shop instead of deleting/creating
          const { data: updatedCart, error: updateError } = await supabase
            .from('carts')
            .update({ 
              shop_id: shopId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCart.id)
            .select()
            .single();

          if (updateError) {
            logger.error('[CART] Failed to update cart shop', { 
              error: updateError, 
              cartId: existingCart.id 
            });
            throw new Error('Failed to switch shop in cart');
          }

          logger.info('[CART] Cart updated to new shop', {
            cartId: updatedCart.id,
            newShopId: shopId
          });
          return updatedCart;
        }
      }

      // No cart exists - create new one
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({
          customer_id: customerId,
          shop_id: shopId,
        })
        .select()
        .single();

      if (createError) {
        logger.error('[CART] Failed to create cart', { 
          error: createError, 
          customerId, 
          shopId 
        });
        throw new Error(`Failed to create cart: ${createError.message}`);
      }

      logger.info('[CART] New cart created', { 
        cartId: newCart.id, 
        customerId, 
        shopId 
      });
      return newCart;
    } catch (error) {
      logger.error('[CART] Error in getOrCreateCart', { 
        error: error.message,
        stack: error.stack,
        customerId,
        shopId
      });
      throw error;
    }
  }

  /**
   * Get customer's cart with items
   */
  async getCustomerCart(customerId, shopId = null) {
    try {
      let query = supabase
        .from('carts')
        .select(`
          id,
          shop_id,
          updated_at,
          shops!inner (
            business_type
          ),
          cart_items (
            id,
            item_id,
            quantity,
            variant,
            items (
              id,
              name,
              description,
              price,
              half_portion_price,
              full_price,
              has_variants,
              image_url,
              is_available,
              stock_quantity
            )
          )
        `)
        .eq('customer_id', customerId);

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to fetch cart', { error, customerId });
        throw new Error('Failed to fetch cart');
      }

      if (!data) {
        return null;
      }

      let itemsTotal = 0;
      let validItems = [];

      // Process variants for frontend format
      if (data.cart_items) {
        for (const ci of data.cart_items) {
          if (!ci.items) continue;

          let itemObj = { ...ci.items };
          let unitPrice = Number(itemObj.price) || 0;

          let variantLabel = ci.variant;
          let variantSuffix = '';

          // Determine correct price based on variant
          if (variantLabel === 'Half' && itemObj.half_portion_price != null) {
            unitPrice = Number(itemObj.half_portion_price);
            variantSuffix = '-half';
          } else if (variantLabel === 'Full' && itemObj.full_price != null) {
            unitPrice = Number(itemObj.full_price);
            variantSuffix = '-full';
          }

          // Remap id to match frontend expectation (e.g., uuid-half)
          const frontendId = variantSuffix ? `${itemObj.id}${variantSuffix}` : itemObj.id;

          // Calculate total
          itemsTotal += unitPrice * ci.quantity;

          validItems.push({
            id: ci.id,
            item_id: frontendId, // used for identifying in frontend
            quantity: ci.quantity,
            items: {
              ...itemObj,
              id: frontendId,
              price: unitPrice,
              portion: variantLabel
            }
          });
        }
      }

      return {
        ...data,
        business_type: data.shops?.business_type || null,
        cart_items: validItems,
        items_count: validItems.length,
        items_total: itemsTotal,
      };
    } catch (error) {
      logger.error('Error in getCustomerCart', { error: error.message });
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItemToCart(customerId, shopId, itemId, quantity, variant) {
    try {
      // LOG 1: Entry point
      logger.info('[CART-SERVICE] addItemToCart called', { 
        customerId, 
        shopId, 
        itemId, 
        quantity, 
        variant 
      });

      // Validate item availability and stock
      const availability = await itemService.checkItemAvailability(itemId, quantity);

      // LOG 2: Availability check result
      logger.info('[CART-SERVICE] Availability checked', { 
        itemId, 
        available: availability.available,
        reason: availability.reason || 'N/A'
      });

      if (!availability.available) {
        throw new Error(availability.reason);
      }

      const item = availability.item;
      let targetPrice = Number(item.price);

      // LOG 3: Item data retrieved
      logger.info('[CART-SERVICE] Item data', { 
        itemId: item.id,
        price: item.price,
        half_portion_price: item.half_portion_price,
        full_price: item.full_price,
        has_variants: item.has_variants,
        variant: variant
      });

      // Determine correct price if it's a variant
      if (variant === 'Half' && item.half_portion_price != null) {
        targetPrice = Number(item.half_portion_price);
        logger.info('[CART-SERVICE] Applied Half variant price', { targetPrice });
      } else if (variant === 'Full' && item.full_price != null) {
        targetPrice = Number(item.full_price);
        logger.info('[CART-SERVICE] Applied Full variant price', { targetPrice });
      } else {
        logger.info('[CART-SERVICE] Using default price', { targetPrice, variant });
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(customerId, shopId);
      
      // LOG 4: Cart obtained
      logger.info('[CART-SERVICE] Cart obtained/created', { 
        cartId: cart.id,
        customerId: cart.customer_id,
        shopId: cart.shop_id
      });

      // We differentiate cart items by both itemId AND variant
      const { data: existingItems, error: fetchError } = await supabase
        .from('cart_items')
        .select('id, quantity, variant')
        .eq('cart_id', cart.id)
        .eq('item_id', itemId);

      if (fetchError) {
        logger.error('[CART-SERVICE] Failed to fetch existing cart items', { 
          error: fetchError,
          cartId: cart.id,
          itemId
        });
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // LOG 5: Existing items check
      logger.info('[CART-SERVICE] Existing items in cart', { 
        existingItems: existingItems || [],
        lookingForVariant: variant
      });

      const existingItem = (existingItems || []).find(i => (i.variant || null) === (variant || null));

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;

        // LOG 6: Update path
        logger.info('[CART-SERVICE] Updating existing cart item', {
          cartItemId: existingItem.id,
          oldQuantity: existingItem.quantity,
          newQuantity
        });

        // Re-validate stock for new quantity
        const recheck = await itemService.checkItemAvailability(itemId, newQuantity);
        if (!recheck.available) {
          throw new Error(recheck.reason);
        }

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (updateError) {
          logger.error('[CART-SERVICE] Failed to update cart item', { 
            error: updateError,
            cartItemId: existingItem.id
          });
          throw new Error('Failed to update cart item');
        }
      } else {
        // Add new item
        const insertPayload = {
          cart_id: cart.id,
          item_id: itemId,
          quantity,
          variant: variant || null
        };

        // LOG 7: Insert path
        logger.info('[CART-SERVICE] Inserting new cart item', { insertPayload });

        const { error: insertError } = await supabase
          .from('cart_items')
          .insert(insertPayload);

        if (insertError) {
          logger.error('[CART-SERVICE] Failed to insert cart item', { 
            error: insertError,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            message: insertError.message,
            insertPayload
          });
          throw new Error(`Failed to add item to cart: ${insertError.message}`);
        }
      }

      // Update cart timestamp
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cart.id);

      logger.info('[CART-SERVICE] Item added to cart successfully', { cartId: cart.id, itemId, quantity, variant });

      // Return updated cart
      return this.getCustomerCart(customerId, shopId);
    } catch (error) {
      logger.error('[CART-SERVICE] Error in addItemToCart', { 
        error: error.message,
        stack: error.stack,
        customerId,
        shopId,
        itemId,
        quantity,
        variant
      });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(customerId, cartItemId, quantity) {
    try {
      if (quantity === 0) {
        return await this.removeCartItem(customerId, cartItemId);
      }

      if (quantity < 0) {
        throw new Error('Quantity must be 0 or greater');
      }

      // Get cart item with item details
      const { data: cartItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('id, cart_id, item_id, quantity, carts!inner(customer_id)')
        .eq('id', cartItemId)
        .single();

      if (fetchError || !cartItem) {
        throw new Error('Cart item not found');
      }

      // Verify ownership
      if (cartItem.carts.customer_id !== customerId) {
        throw new Error('Unauthorized');
      }

      // Validate stock
      const availability = await itemService.checkItemAvailability(cartItem.item_id, quantity);
      if (!availability.available) {
        throw new Error(availability.reason);
      }

      // Update quantity
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (updateError) {
        logger.error('Failed to update cart item', { error: updateError });
        throw new Error('Failed to update cart item');
      }

      // Update cart timestamp
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cartItem.cart_id);

      logger.info('Cart item updated', { cartItemId, quantity });

      return { success: true };
    } catch (error) {
      logger.error('Error in updateCartItem', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(customerId, cartItemId) {
    try {
      // Get cart item to verify ownership
      const { data: cartItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('id, cart_id, carts!inner(customer_id)')
        .eq('id', cartItemId)
        .single();

      if (fetchError || !cartItem) {
        throw new Error('Cart item not found');
      }

      // Verify ownership
      if (cartItem.carts.customer_id !== customerId) {
        throw new Error('Unauthorized');
      }

      // Delete item
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (deleteError) {
        logger.error('Failed to remove cart item', { error: deleteError });
        throw new Error('Failed to remove cart item');
      }

      // Just update timestamp - don't delete empty cart due to UNIQUE constraint
      // Cart remains and gets reused when new items are added
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cartItem.cart_id);

      logger.info('Cart item removed', { cartItemId });

      return { success: true };
    } catch (error) {
      logger.error('Error in removeCartItem', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear entire cart (removes all items)
   * Note: Doesn't delete cart itself due to UNIQUE constraint on customer_id
   */
  async clearCart(customerId, shopId) {
    try {
      const cart = await this.getOrCreateCart(customerId, shopId);

      // Delete all cart items instead of the cart itself
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) {
        logger.error('[CART] Failed to clear cart items', { error, cartId: cart.id });
        throw new Error('Failed to clear cart');
      }

      logger.info('[CART] Cart items cleared', { cartId: cart.id });

      return { success: true };
    } catch (error) {
      logger.error('[CART] Error in clearCart', { 
        error: error.message,
        customerId,
        shopId
      });
      throw error;
    }
  }
}

export default new CartService();
