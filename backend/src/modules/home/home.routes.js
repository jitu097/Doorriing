import { Router } from 'express';
import homeController from './home.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/items', optionalAuth, homeController.getHomeItems);

export default router;
