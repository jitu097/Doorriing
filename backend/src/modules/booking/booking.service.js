import { supabase } from '../../config/supabaseClient.js';
import { logger } from '../../utils/logger.js';
import { NOTIFICATION_TYPE } from '../../utils/constants.js';

class BookingService {
  /**
   * Create a new booking and notify shop owner
   */
  async createBooking(bookingData) {
    try {
      const { shopId, customerId, customerName, customerPhone, numberOfGuests, bookingDate, bookingTime } = bookingData;

      // Get shop details to find the seller/owner
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, name, seller_id')
        .eq('id', shopId)
        .single();

      if (shopError || !shop) {
        throw new Error('Shop not found');
      }

      // Create the booking (Note: bookings table doesn't have customer_id column)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            shop_id: shopId,
            customer_name: customerName,
            customer_phone: customerPhone,
            number_of_guests: numberOfGuests,
            booking_date: bookingDate,
            booking_time: bookingTime,
            status: 'Pending',
          },
        ])
        .select()
        .single();

      if (bookingError) {
        logger.error('Failed to create booking', { error: bookingError });
        throw new Error('Failed to create booking');
      }

      // Create notification for shop owner/seller
      const notificationTitle = '🎉 New Party Booking Enquiry!';
      const notificationMessage = `${customerName} requested a party booking for ${numberOfGuests} guests on ${bookingDate} at ${bookingTime}. Phone: ${customerPhone}`;

      await this.createNotification(
        shop.seller_id,
        notificationTitle,
        notificationMessage,
        NOTIFICATION_TYPE.BOOKING,
        { bookingId: booking.id, shopId: shopId }
      );

      logger.info('Booking created and notification sent', { bookingId: booking.id, shopId, sellerId: shop.seller_id });

      return booking;
    } catch (error) {
      logger.error('Error in createBooking', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper method to create notification
   */
  async createNotification(customerId, title, message, type, metadata = {}) {
    try {
      const { error } = await supabase.from('notifications').insert([
        {
          customer_id: customerId,
          title: title,
          message: message,
          type: type,
          metadata: metadata,
          is_read: false,
        },
      ]);

      if (error) {
        logger.error('Failed to create notification', { error });
        throw new Error('Failed to create notification');
      }
    } catch (error) {
      logger.error('Error in createNotification', { error: error.message });
      // Don't throw error here - notification failure shouldn't fail the booking
      logger.warn('Notification creation failed, but booking was successful');
    }
  }

  /**
   * Get bookings for a shop (for shop owner/admin)
   */
  async getShopBookings(shopId, filters = {}) {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('shop_id', shopId);

      // Filter by status if provided
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Filter by date if provided
      if (filters.date) {
        query = query.eq('booking_date', filters.date);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch shop bookings', { error, shopId });
        throw new Error('Failed to fetch bookings');
      }

      return data;
    } catch (error) {
      logger.error('Error in getShopBookings', { error: error.message });
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId, status, sellerId) {
    try {
      // Verify the booking belongs to seller's shop
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('id, shop_id, shops!inner(seller_id)')
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        throw new Error('Booking not found');
      }

      if (booking.shops.seller_id !== sellerId) {
        throw new Error('Unauthorized');
      }

      // Update status
      const { data, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update booking status', { error, bookingId });
        throw new Error('Failed to update booking');
      }

      logger.info('Booking status updated', { bookingId, status });

      return data;
    } catch (error) {
      logger.error('Error in updateBookingStatus', { error: error.message });
      throw error;
    }
  }

  /**
   * Get customer's bookings by phone number
   * Note: bookings table doesn't have customer_id column
   */
  async getCustomerBookings(customerPhone) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, shops(name, city)')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch customer bookings', { error, customerPhone });
        throw new Error('Failed to fetch bookings');
      }

      return data;
    } catch (error) {
      logger.error('Error in getCustomerBookings', { error: error.message });
      throw error;
    }
  }
}

export default new BookingService();
