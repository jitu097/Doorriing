import { Router } from 'express';
import platformController from './platform.controller.js';

const router = Router();

router.get('/', platformController.getSettings);
router.get('/availability', platformController.getAvailability);

export default router;
