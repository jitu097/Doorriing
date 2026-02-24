import bookingService from './booking.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class BookingController {
  /**
   * Create a new booking
   * POST /api/bookings
   */
  async createBooking(req, res, next) {
    try {
      const { shopId, customerName, customerPhone, numberOfGuests, bookingDate, bookingTime } = req.body;

      // Validation
      if (!shopId || !customerName || !customerPhone || !numberOfGuests || !bookingDate || !bookingTime) {
        return sendError(res, 'All fields are required', 400);
      }

      const customerId = req.user?.customerId || null; // Optional - might be guest booking

      const bookingData = {
        shopId,
        customerId,
        customerName,
        customerPhone,
        numberOfGuests,
        bookingDate,
        bookingTime,
      };

      const booking = await bookingService.createBooking(bookingData);

      return sendSuccess(res, booking, 'Booking created successfully', 201);
    } catch (error) {
      logger.error('CreateBooking controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get shop bookings (for sellers)
   * GET /api/bookings/shop/:shopId
   */
  async getShopBookings(req, res, next) {
    try {
      const { shopId } = req.params;
      const { status, date } = req.query;

      const filters = { status, date };

      const bookings = await bookingService.getShopBookings(shopId, filters);

      return sendSuccess(res, bookings, 'Shop bookings fetched successfully');
    } catch (error) {
      logger.error('GetShopBookings controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Update booking status
   * PUT /api/bookings/:id/status
   */
  async updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { customerId } = req.user; // This will be the seller ID

      if (!status) {
        return sendError(res, 'Status is required', 400);
      }

      const validStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 'Invalid status', 400);
      }

      const booking = await bookingService.updateBookingStatus(id, status, customerId);

      return sendSuccess(res, booking, 'Booking status updated successfully');
    } catch (error) {
      logger.error('UpdateBookingStatus controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get customer bookings by phone number
   * GET /api/bookings/my-bookings?phone=xxx
   * Note: bookings table doesn't have customer_id column
   */
  async getMyBookings(req, res, next) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return sendError(res, 'Phone number is required', 400);
      }

      const bookings = await bookingService.getCustomerBookings(phone);

      return sendSuccess(res, bookings, 'Your bookings fetched successfully');
    } catch (error) {
      logger.error('GetMyBookings controller error', { error: error.message });
      next(error);
    }
  }
}

export default new BookingController();
