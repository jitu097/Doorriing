import api from './api';

const bookingService = {
  /**
   * Create a new party booking
   */
  async createBooking(bookingData) {
    try {
      const response = await api.post('/bookings', bookingData);
      return response;
    } catch (error) {
      console.error('Create booking error:', error);
      throw error;
    }
  },

  /**
   * Get customer's bookings
   */
  async getMyBookings() {
    try {
      const response = await api.get('/bookings/my-bookings');
      return response;
    } catch (error) {
      console.error('Get my bookings error:', error);
      throw error;
    }
  },

  /**
   * Get shop bookings (for sellers)
   */
  async getShopBookings(shopId, filters = {}) {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.date) params.date = filters.date;

      const response = await api.get(`/bookings/shop/${shopId}`, { params });
      return response;
    } catch (error) {
      console.error('Get shop bookings error:', error);
      throw error;
    }
  },

  /**
   * Update booking status (for sellers)
   */
  async updateBookingStatus(bookingId, status) {
    try {
      const response = await api.put(`/bookings/${bookingId}/status`, { status });
      return response;
    } catch (error) {
      console.error('Update booking status error:', error);
      throw error;
    }
  }
};

export default bookingService;
