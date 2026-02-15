import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';

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
}

export default new AuthService();
