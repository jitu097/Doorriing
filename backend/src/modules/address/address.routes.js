import { Router } from 'express';
import addressController from './address.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all address routes
router.use(authenticate);

router.get('/', addressController.getAddresses);
router.post('/', addressController.addAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/default', addressController.setDefaultAddress);

export default router;
