import { Router } from 'express';
import shopController from './shop.controller.js';
import reviewController from '../review/review.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// Get shops for home page (must be first to avoid route conflicts)
router.get('/home', optionalAuth, shopController.getShopsForHome);

// Get nearby shops (must be before /:id to avoid route conflict)
router.get('/nearby', optionalAuth, shopController.getNearbyShops);

// Get shops by business type for Browse Page (must be before /:id)
router.get('/browse/:businessType', optionalAuth, shopController.getShopsByBusinessType);

// Get all shops with filters
router.get('/', optionalAuth, shopController.getShops);

// ---------------------------
// Shop Review Routes (must be after specific routes)
// ---------------------------

// GET /api/shops/:shopId/reviews - Get all reviews for a shop
router.get('/:shopId/reviews', reviewController.getShopReviews);

// GET /api/shops/:shopId/rating-stats - Get rating stats for a shop
router.get('/:shopId/rating-stats', reviewController.getShopRatingStats);

// Get shop by ID (must be last among single-segment routes)
router.get('/:id', optionalAuth, shopController.getShopById);

export default router;
