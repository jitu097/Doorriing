import express from 'express';
import bookingController from './booking.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Public (no auth required for guest bookings)
 */
router.post('/', bookingController.createBooking);

/**
 * @route   GET /api/bookings/my-bookings?phone=xxx
 * @desc    Get customer's bookings by phone number
 * @access  Public
 */
router.get('/my-bookings', bookingController.getMyBookings);

/**
 * @route   GET /api/bookings/shop/:shopId
 * @desc    Get all bookings for a shop
 * @access  Private (seller only)
 */
router.get('/shop/:shopId', authenticate, bookingController.getShopBookings);

/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Update booking status
 * @access  Private (seller only)
 */
router.put('/:id/status', authenticate, bookingController.updateBookingStatus);

export default router;
