import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import shopRoutes from '../modules/shop/shop.routes.js';
import categoryRoutes from '../modules/category/category.routes.js';
import subcategoryRoutes from '../modules/subcategory/subcategory.routes.js';
import itemRoutes from '../modules/item/item.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import orderRoutes from '../modules/order/order.routes.js';
import notificationRoutes from '../modules/notification/notification.routes.js';
import addressRoutes from '../modules/address/address.routes.js';
import bookingRoutes from '../modules/booking/booking.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/shops', shopRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/items', itemRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user/addresses', addressRoutes);
router.use('/bookings', bookingRoutes);

export default router;
