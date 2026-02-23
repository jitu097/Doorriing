import { supabase } from '../config/supabaseClient.js';
import { logger } from '../utils/logger.js';

export const cartService = {
  /**
   * Add an item to the cart or increase its quantity.
   */
  async addToCart(customerId, itemId, quantity = 1) {
    try {
      // 1. Fetch item to get shop_id and price, check availability
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, shop_id, price, is_available')
        .eq('id', itemId)
        .single();

      if (itemError) throw new Error('Item not found');
      if (!item.is_available) throw new Error('Item is currently unavailable');

      const shopId = item.shop_id;
      const unitPrice = item.price;

      // 2. Check for active cart for this customer
      const { data: activeCart, error: cartError } = await supabase
        .from('carts')
        .select('id, shop_id')
        .eq('customer_id', customerId)
        .maybeSingle();

      let cartId;

      if (activeCart) {
        // Active cart exists
        if (activeCart.shop_id !== shopId) {
          throw new Error('Cannot add items from different shops to the same cart');
        }
        cartId = activeCart.id;
      } else {
        // No active cart, create one
        const { data: newCart, error: createCartError } = await supabase
          .from('carts')
          .insert({
            customer_id: customerId,
            shop_id: shopId,
          })
          .select('id')
          .single();

        if (createCartError) throw new Error('Failed to create cart');
        cartId = newCart.id;
      }

      // 3. Add or update item in cart_items table
      const { data: existingCartItem, error: existingItemError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existingCartItem) {
        // Item already in cart, update quantity
        const newQuantity = existingCartItem.quantity + quantity;
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            unit_price: unitPrice, // Ensure price is always up to date
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCartItem.id);

        if (updateError) throw new Error('Failed to update cart item');
      } else {
        // Insert new cart item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            item_id: itemId,
            quantity: quantity,
            unit_price: unitPrice
          });

        if (insertError) throw new Error('Failed to add item to cart');
      }

      // Optionally, update carts updated_at
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cartId);

      return { success: true, message: 'Item added to cart' };
    } catch (error) {
      logger.error('cartService.addToCart error', { error: error.message, customerId, itemId });
      throw error;
    }
  },

  /**
   * Update quantity of an item in the cart.
   */
  async updateCartItem(customerId, itemId, quantity) {
    try {
      // 1. Get the cart
      const { data: activeCart } = await supabase
        .from('carts')
        .select('id')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!activeCart) throw new Error('Cart not found');

      // 2. Adjust or remove item
      if (quantity <= 0) {
        // Remove item entirely
        await this.removeFromCart(customerId, itemId);
      } else {
        // Update quantity
        const { data: item } = await supabase
          .from('items')
          .select('price')
          .eq('id', itemId)
          .single();

        if (!item) throw new Error('Item no longer exists');

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity, 
            unit_price: item.price,
            updated_at: new Date().toISOString()
          })
          .eq('cart_id', activeCart.id)
          .eq('item_id', itemId);

        if (updateError) throw new Error('Failed to update cart item quantity');
      }

      // Update cart updated_at
      await supabase
        .from('carts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeCart.id);

      // Clean up empty cart automatically
      await this.cleanupEmptyCart(activeCart.id);

      return { success: true, message: 'Cart item updated' };
    } catch (error) {
      logger.error('cartService.updateCartItem error', { error: error.message, customerId, itemId });
      throw error;
    }
  },

  /**
   * Remove a specific item from the cart.
   */
  async removeFromCart(customerId, itemId) {
    try {
      const { data: activeCart } = await supabase
        .from('carts')
        .select('id')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!activeCart) return { success: true };

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', activeCart.id)
        .eq('item_id', itemId);

      if (deleteError) throw new Error('Failed to remove item from cart');

      await this.cleanupEmptyCart(activeCart.id);

      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
       logger.error('cartService.removeFromCart error', { error: error.message, customerId, itemId });
       throw error;
    }
  },

  /**
   * Get the full cart details for a customer.
   */
  async getCart(customerId) {
    try {
      const { data: cart } = await supabase
        .from('carts')
        .select(`
          id,
          shop_id,
          shops ( name, shop_type ),
          cart_items (
            id,
            quantity,
            unit_price,
            item_id,
            items (
              id,
              name,
              description,
              image_url,
              price,
              is_available
            )
          )
        `)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        return {
          items: [],
          subtotal: 0,
          total_items: 0,
          shop_id: null,
          shop_type: null
        };
      }

      // Calculate totals and format items list
      let subtotal = 0;
      let totalItemsCount = 0;
      
      // Filter out mapped items that might have been deleted but still exist in cart_items
      const validCartItems = cart.cart_items.filter(ci => ci.items);

      const formattedItems = validCartItems.map(ci => {
        subtotal += ci.quantity * parseFloat(ci.unit_price);
        totalItemsCount += ci.quantity;

        return {
          id: ci.items.id,
          cartItemId: ci.id,
          name: ci.items.name,
          description: ci.items.description,
          image_url: ci.items.image_url,
          price: parseFloat(ci.unit_price), // actual paid/current unit price
          quantity: ci.quantity,
          is_available: ci.items.is_available
        };
      });

      return {
        items: formattedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        total_items: totalItemsCount,
        shop_id: cart.shop_id,
        shop: cart.shops // Return shop info for UI details
      };
    } catch (error) {
      logger.error('cartService.getCart error', { error: error.message, customerId });
      throw error;
    }
  },

  /**
   * Clears the entire cart for a customer.
   */
  async clearCart(customerId) {
    try {
      // Deleting the cart will automatically delete cart_items due to ON DELETE CASCADE
      const { error: deleteError } = await supabase
        .from('carts')
        .delete()
        .eq('customer_id', customerId);

      if (deleteError) throw new Error('Failed to clear cart');
      
      return { success: true, message: 'Cart cleared successfully' };
    } catch (error) {
      logger.error('cartService.clearCart error', { error: error.message, customerId });
      throw error;
    }
  },

  /**
   * Helper: Check if a cart has items, if not, delete the cart.
   */
  async cleanupEmptyCart(cartId) {
    const { count } = await supabase
      .from('cart_items')
      .select('id', { count: 'exact', head: true })
      .eq('cart_id', cartId);
      
    if (count === 0 || count === null) {
      await supabase.from('carts').delete().eq('id', cartId);
    }
  }
};
