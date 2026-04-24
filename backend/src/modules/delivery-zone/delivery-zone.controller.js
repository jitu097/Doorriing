import { deliveryZoneService } from './delivery-zone.service.js';
import { checkServiceability, validateCoordinates } from '../../utils/distance.util.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class DeliveryZoneController {
  /**
   * GET /api/delivery-zone
   * Get delivery zone configuration and details
   */
  async getZoneConfig(req, res, next) {
    try {
      const zoneConfig = deliveryZoneService.getZoneConfig();
      return sendSuccess(res, zoneConfig, 'Delivery zone configuration fetched');
    } catch (error) {
      logger.error('GetZoneConfig error', { error: error.message });
      next(error);
    }
  }

  /**
   * POST /api/delivery-zone/check-serviceability
   * Check if user location is serviceable
   * Body: { latitude, longitude }
   */
  async checkServiceability(req, res, next) {
    try {
      const { latitude, longitude } = req.body;

      // Validate coordinates
      const validation = validateCoordinates(latitude, longitude);
      if (!validation.valid) {
        return sendError(res, validation.error, 400);
      }

      const zoneConfig = deliveryZoneService.getZoneConfig();
      const result = checkServiceability(
        validation.latitude,
        validation.longitude,
        zoneConfig
      );

      return sendSuccess(res, result, 'Serviceability checked');
    } catch (error) {
      logger.error('CheckServiceability error', { error: error.message });
      next(error);
    }
  }

  /**
   * GET /api/delivery-zone/check?latitude=X&longitude=Y
   * Check serviceability via query params (alternative endpoint)
   */
  async checkServiceabilityQuery(req, res, next) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        return sendError(res, 'Latitude and longitude are required', 400);
      }

      // Validate coordinates
      const validation = validateCoordinates(latitude, longitude);
      if (!validation.valid) {
        return sendError(res, validation.error, 400);
      }

      const zoneConfig = deliveryZoneService.getZoneConfig();
      const result = checkServiceability(
        validation.latitude,
        validation.longitude,
        zoneConfig
      );

      return sendSuccess(res, result, 'Serviceability checked');
    } catch (error) {
      logger.error('CheckServiceabilityQuery error', { error: error.message });
      next(error);
    }
  }
}

export default new DeliveryZoneController();
