import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import itemService from '../item/item.service.js';

class CartService {
  /**
   * Get or create active cart for customer and shop
   */
  async getOrCreateCart(customerId, shopId) {
    try {
      // Check if cart exists
      const { data: existingCart, error: fetchError } = await supabase
        .from('carts')
        .select('id, customer_id, shop_id, updated_at')
        .eq('customer_id', customerId)
        .eq('shop_id', shopId)
        .single();

      if (existingCart) {
        return existingCart;
      }

      // Create new cart
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({
          customer_id: customerId,
          shop_id: shopId,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create cart', { error: createError, customerId, shopId });
        throw new Error('Failed to create cart');
      }

      logger.info('New cart created', { cartId: newCart.id, customerId, shopId });
      return newCart;
    } catch (error) {
      logger.error('Error in getOrCreateCart', { error: error.message });
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
          cart_items (
            id,
            item_id,
            quantity,
            items (
              id,
              name,
              description,
              price,
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

      // Calculate total
      const itemsTotal = data.cart_items.reduce((sum, item) => {
        return sum + (item.items.price * item.quantity);
      }, 0);

      return {
        ...data,
        items_count: data.cart_items.length,
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
  async addItemToCart(customerId, shopId, itemId, quantity) {
    try {
      // Validate item availability and stock
      const availability = await itemService.checkItemAvailability(itemId, quantity);
      
      if (!availability.available) {
        throw new Error(availability.reason);
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(customerId, shopId);

      // Check if item already in cart
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('item_id', itemId)
        .single();

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;

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
          logger.error('Failed to update cart item', { error: updateError });
          throw new Error('Failed to update cart item');
        }
      } else {
        // Add new item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            item_id: itemId,
            quantity,
          });

        if (insertError) {
          logger.error('Failed to add item to cart', { error: insertError });
          throw new Error('Failed to add item to cart');
        }
      }

      // Update cart timestamp
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cart.id);

      logger.info('Item added to cart', { cartId: cart.id, itemId, quantity });

      // Return updated cart
      return this.getCustomerCart(customerId, shopId);
    } catch (error) {
      logger.error('Error in addItemToCart', { error: error.message });
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(customerId, cartItemId, quantity) {
    try {
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
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

      // Update cart timestamp
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
   * Clear entire cart
   */
  async clearCart(customerId, shopId) {
    try {
      const cart = await this.getOrCreateCart(customerId, shopId);

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) {
        logger.error('Failed to clear cart', { error });
        throw new Error('Failed to clear cart');
      }

      logger.info('Cart cleared', { cartId: cart.id });

      return { success: true };
    } catch (error) {
      logger.error('Error in clearCart', { error: error.message });
      throw error;
    }
  }
}

export default new CartService();
