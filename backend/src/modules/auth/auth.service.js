import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { firebaseAuth } from '../../config/firebaseAdmin.js';

class AuthService {
  /**
   * Create or get customer record
   */
  async createOrGetCustomer(firebaseUid, email, fullName = null, phone = null) {
    try {
      // Check if customer exists
      const { data: existing, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('firebase_uid', firebaseUid)
        .single();

      if (existing) {
        return { customer: existing };
      }

      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          firebase_uid: firebaseUid,
          email,
          full_name: fullName || email.split('@')[0],
          phone: phone || null,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create customer', { error: createError, firebaseUid });
        throw new Error('Failed to create customer account');
      }

      logger.info('New customer created', { customerId: newCustomer.id });
      return { customer: newCustomer, isNew: true };
    } catch (error) {
      logger.error('Error in createOrGetCustomer', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync customer from Firebase token payload safely
   */
  async syncCustomer(firebaseUser) {
    try {
      const { uid: firebaseUid, email, name: fullName } = firebaseUser;

      if (!firebaseUid || !email) {
        throw new Error('Invalid Firebase user payload: missing uid or email');
      }

      // Check if customer exists
      const { data: existing, error: fetchError } = await supabase
        .from('customers')
        .select('id, firebase_uid, email, full_name, phone, created_at, updated_at')
        .eq('firebase_uid', firebaseUid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Error fetching customer during sync', { error: fetchError });
        throw new Error('Database error during sync');
      }

      if (existing) {
        return existing;
      }

      // Insert new customer if it doesn't exist
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          firebase_uid: firebaseUid,
          email: email,
          full_name: fullName || email.split('@')[0],
          phone: firebaseUser.phone_number || null,
        })
        .select('id, firebase_uid, email, full_name, phone, created_at, updated_at')
        .single();

      if (insertError) {
        logger.error('Failed to insert new customer during sync', { error: insertError, firebaseUid });
        // Handle race condition where user might exist due to concurrent requests
        if (insertError.code === '23505') { // unique violation
          const { data: retryExisting } = await supabase
            .from('customers')
            .select('id, firebase_uid, email, full_name, phone, created_at, updated_at')
            .eq('firebase_uid', firebaseUid)
            .single();
          if (retryExisting) return retryExisting;
        }
        throw new Error('Failed to sync new customer account');
      }

      logger.info('New customer synced from Firebase', { customerId: newCustomer.id });
      return newCustomer;
    } catch (error) {
      logger.error('Error in syncCustomer', { error: error.message });
      throw error;
    }
  }

  /**
   * Get customer profile
   */
  async getCustomerProfile(customerId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, firebase_uid, email, full_name, phone, created_at, updated_at')
        .eq('id', customerId)
        .single();

      if (error) {
        logger.error('Failed to fetch customer profile', { error, customerId });
        throw new Error('Failed to fetch profile');
      }

      return data;
    } catch (error) {
      logger.error('Error in getCustomerProfile', { error: error.message });
      throw error;
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(customerId, updates) {
    try {
      const allowedFields = ['full_name', 'phone'];
      const sanitizedUpdates = {};

      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          sanitizedUpdates[key] = updates[key];
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('customers')
        .update(sanitizedUpdates)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update customer profile', { error, customerId });
        throw new Error('Failed to update profile');
      }

      logger.info('Customer profile updated', { customerId });
      return data;
    } catch (error) {
      logger.error('Error in updateCustomerProfile', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete account and all associated data
   */
  async deleteAccount(customerId, firebaseUid) {
    try {
      logger.info('Starting account deletion', { customerId, firebaseUid });

      // 1. Delete cart data
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (cart) {
        await supabase.from('cart_items').delete().eq('cart_id', cart.id);
        await supabase.from('carts').delete().eq('id', cart.id);
      }

      // 2. Delete addresses
      await supabase.from('customer_addresses').delete().eq('customer_id', customerId);

      // 3. Delete orders
      await supabase.from('orders').delete().eq('customer_id', customerId);

      // 4. Delete notifications
      await supabase.from('notifications').delete().eq('customer_id', customerId);

      // 5. Delete profile
      const { error: profileError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (profileError) {
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      // 6. Delete from Firebase Auth
      await firebaseAuth.deleteUser(firebaseUid);

      logger.info('Account deleted successfully', { customerId });
      return true;
    } catch (error) {
      logger.error('Error in deleteAccount', { error: error.message, customerId });
      throw error;
    }
  }
}

export default new AuthService();
