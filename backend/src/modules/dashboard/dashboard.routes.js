import { Router } from 'express';
import dashboardController from './dashboard.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

// Mobile aggregated dashboard
router.get('/mobile', optionalAuth, dashboardController.getMobileDashboard);

export default router;
