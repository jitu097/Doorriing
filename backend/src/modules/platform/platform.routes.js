import { Router } from 'express';
import platformController from './platform.controller.js';

const router = Router();

router.get('/', platformController.getSettings);

export default router;
