import { Router } from 'express';
import deliveryZoneController from './delivery-zone.controller.js';

const router = Router();

/**
 * GET /api/delivery-zone
 * Fetch delivery zone configuration
 */
router.get('/', deliveryZoneController.getZoneConfig.bind(deliveryZoneController));

/**
 * GET /api/delivery-zone/check
 * Check serviceability via query params
 */
router.get('/check', deliveryZoneController.checkServiceabilityQuery.bind(deliveryZoneController));

/**
 * POST /api/delivery-zone/check-serviceability
 * Check serviceability via POST body
 */
router.post('/check-serviceability', deliveryZoneController.checkServiceability.bind(deliveryZoneController));

export default router;
