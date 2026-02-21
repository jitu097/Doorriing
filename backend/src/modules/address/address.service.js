import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';

class AddressService {
    /**
     * Get all addresses for a customer
     */
    async getAddresses(customerId) {
        try {
            const { data, error } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customerId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('Failed to fetch addresses', { error, customerId });
                throw new Error('Failed to fetch addresses');
            }

            return data || [];
        } catch (error) {
            logger.error('Error in getAddresses', { error: error.message });
            throw error;
        }
    }

    /**
     * Add a new address
     */
    async addAddress(customerId, payload) {
        try {
            // Check limit
            const { count, error: countError } = await supabase
                .from('customer_addresses')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', customerId);

            if (countError) throw new Error('Failed to verify address limit');
            if (count >= 10) throw new Error('Maximum address limit (10) reached');

            // Check duplicate exact match
            const { data: duplicate } = await supabase
                .from('customer_addresses')
                .select('id')
                .eq('customer_id', customerId)
                .eq('address_line_1', payload.address_line_1)
                .eq('address_line_2', payload.address_line_2)
                .single();

            if (duplicate) throw new Error('Identical address already exists');

            // If this is default, remove default from others
            if (payload.is_default) {
                await supabase
                    .from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', customerId);
            } else if (count === 0) {
                payload.is_default = true; // First address is always default
            }

            const { data, error } = await supabase
                .from('customer_addresses')
                .insert({
                    customer_id: customerId,
                    ...payload
                })
                .select()
                .single();

            if (error) {
                logger.error('Failed to add address', { error, customerId });
                throw new Error('Failed to create address');
            }

            return data;
        } catch (error) {
            logger.error('Error in addAddress', { error: error.message });
            throw error;
        }
    }

    /**
     * Update an existing address
     */
    async updateAddress(customerId, addressId, payload) {
        try {
            // Check ownership
            const { data: initial, error: initialError } = await supabase
                .from('customer_addresses')
                .select('is_default')
                .eq('id', addressId)
                .eq('customer_id', customerId)
                .single();

            if (initialError || !initial) throw new Error('Address not found or unauthorized');

            // If setting as default, remove default from others
            if (payload.is_default && !initial.is_default) {
                await supabase
                    .from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', customerId);
            }

            const { data, error } = await supabase
                .from('customer_addresses')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', addressId)
                .eq('customer_id', customerId)
                .select()
                .single();

            if (error) {
                logger.error('Failed to update address', { error, addressId });
                throw new Error('Failed to update address');
            }

            return data;
        } catch (error) {
            logger.error('Error in updateAddress', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete an address
     */
    async deleteAddress(customerId, addressId) {
        try {
            // Check ownership
            const { data: existing, error: initialError } = await supabase
                .from('customer_addresses')
                .select('is_default')
                .eq('id', addressId)
                .eq('customer_id', customerId)
                .single();

            if (initialError || !existing) throw new Error('Address not found or unauthorized');

            const { error } = await supabase
                .from('customer_addresses')
                .delete()
                .eq('id', addressId)
                .eq('customer_id', customerId);

            if (error) {
                logger.error('Failed to delete address', { error, addressId });
                throw new Error('Failed to delete address');
            }

            // If deleted default, make another one default (if exists)
            if (existing.is_default) {
                const { data: remaining } = await supabase
                    .from('customer_addresses')
                    .select('id')
                    .eq('customer_id', customerId)
                    .limit(1);

                if (remaining && remaining.length > 0) {
                    await supabase
                        .from('customer_addresses')
                        .update({ is_default: true })
                        .eq('id', remaining[0].id)
                        .eq('customer_id', customerId);
                }
            }

            return true;
        } catch (error) {
            logger.error('Error in deleteAddress', { error: error.message });
            throw error;
        }
    }

    /**
     * Set address as default
     */
    async setDefaultAddress(customerId, addressId) {
        try {
            // Verify ownership
            const { data: existing, error: initialError } = await supabase
                .from('customer_addresses')
                .select('id')
                .eq('id', addressId)
                .eq('customer_id', customerId)
                .single();

            if (initialError || !existing) throw new Error('Address not found or unauthorized');

            // Clear all defaults
            await supabase
                .from('customer_addresses')
                .update({ is_default: false })
                .eq('customer_id', customerId);

            // Set new default
            const { data, error } = await supabase
                .from('customer_addresses')
                .update({ is_default: true, updated_at: new Date().toISOString() })
                .eq('id', addressId)
                .eq('customer_id', customerId)
                .select()
                .single();

            if (error) {
                logger.error('Failed to set default address', { error, addressId });
                throw new Error('Failed to set default address');
            }

            return data;
        } catch (error) {
            logger.error('Error in setDefaultAddress', { error: error.message });
            throw error;
        }
    }
}

export default new AddressService();
