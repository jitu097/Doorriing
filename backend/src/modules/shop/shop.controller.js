import shopService from './shop.service.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants.js';
import { checkServiceability, validateCoordinates } from '../../utils/distance.util.js';
import { deliveryZoneService } from '../delivery-zone/delivery-zone.service.js';

class ShopController {
  /**
   * Get all shops with filters
   * GET /api/shops
   */
  async getShops(req, res, next) {
    try {
      const { business_type, city, search, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      const filters = {
        business_type,
        city,
        search,
      };

      const result = await shopService.getShops(
        filters,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.shops, result.pagination, 'Shops fetched successfully');
    } catch (error) {
      logger.error('GetShops controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get shop by ID
   * GET /api/shops/:id
   */
  async getShopById(req, res) {
    try {
      const { id } = req.params;
      const { include_categories, include_inventory } = req.query;

      const shop = await shopService.getShopById(id, {
        includeCategories: include_categories === 'true',
        includeInventory: include_inventory !== 'false',
      });

      if (!shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: shop
      });

    } catch (error) {
      console.error('Shop controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch shop'
      });
    }
  }

  /**
   * Get nearby shops
   * GET /api/shops/nearby
   */
  async getNearbyShops(req, res, next) {
    try {
      const { latitude, longitude, radius = 10, business_type } = req.query;

      if (!latitude || !longitude) {
        return sendError(res, 'Latitude and longitude are required', 400);
      }

      const shops = await shopService.getNearbyShops(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius),
        business_type
      );

      return sendSuccess(res, shops, 'Nearby shops fetched successfully');
    } catch (error) {
      logger.error('GetNearbyShops controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get shops by business type for Browse Page
   * GET /api/shops/browse/:businessType
   * Used in: Browse Page after selecting Grocery or Restaurant
   */
  async getShopsByBusinessType(req, res, next) {
    try {
      const { businessType } = req.params;
      const { page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      // Validate business type
      if (!['grocery', 'restaurant'].includes(businessType)) {
        return sendError(res, 'Invalid business type. Must be "grocery" or "restaurant"', 400);
      }

      const result = await shopService.getShopsByBusinessType(
        businessType,
        parseInt(page),
        parseInt(page_size)
      );

      return sendPaginated(res, result.shops, result.pagination, 'Shops fetched successfully');
    } catch (error) {
      logger.error('GetShopsByBusinessType controller error', { error: error.message });
      // Expose the raw error message to client for debugging
      return res.status(500).json({ success: false, message: 'Failed to fetch shops', rawError: error.message, stack: error.stack });
    }
  }

  /**
   * Get shops for home page
   * GET /api/shops/home
   * Used in: Home Page to display grocery and restaurant sections
   */
  async getShopsForHome(req, res, next) {
    try {
      const { limit = 6 } = req.query;

      const shops = await shopService.getShopsForHome(parseInt(limit));
      return sendSuccess(res, shops, 'Home page shops fetched successfully');
    } catch (error) {
      logger.error('GetShopsForHome controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get all shops within service area
   * GET /api/shops/serviceable
   * Required: latitude, longitude (user location)
   * Returns all shops if user is inside the delivery zone, else empty array with serviceability message
   */
  async getServiceableShops(req, res, next) {
    try {
      const { latitude, longitude, business_type, page = 1, page_size = DEFAULT_PAGE_SIZE } = req.query;

      // Validate coordinates
      if (!latitude || !longitude) {
        return sendError(res, 'Latitude and longitude are required', 400);
      }

      const validation = validateCoordinates(latitude, longitude);
      if (!validation.valid) {
        return sendError(res, validation.error, 400);
      }

      // Check serviceability
      const zoneConfig = deliveryZoneService.getZoneConfig();
      const serviceabilityResult = checkServiceability(
        validation.latitude,
        validation.longitude,
        zoneConfig
      );

      // If not serviceable, return empty shops with message
      if (!serviceabilityResult.isServiceable) {
        return sendSuccess(
          res,
          {
            shops: [],
            pagination: { page: 1, page_size, total: 0, total_pages: 0 },
            serviceable: false,
            message: serviceabilityResult.message,
          },
          'Location is outside service area'
        );
      }

      // If serviceable, get shops based on business_type
      let result;
      if (business_type) {
        result = await shopService.getShopsByBusinessType(business_type, parseInt(page), parseInt(page_size));
      } else {
        result = await shopService.getShops({ business_type: null, city: null, search: null }, parseInt(page), parseInt(page_size));
      }

      return sendPaginated(
        res,
        result.shops,
        result.pagination,
        'Serviceable shops fetched successfully',
        { serviceable: true, ...serviceabilityResult }
      );
    } catch (error) {
      logger.error('GetServiceableShops controller error', { error: error.message });
      next(error);
    }
  }
}

export default new ShopController();
