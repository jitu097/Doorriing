import { sendSuccess, sendError } from '../../utils/response.js';
import dashboardService from './dashboard.service.js';

class DashboardController {
  async getMobileDashboard(req, res, next) {
    try {
      const { lat, lng, shop_id, radius, limit } = req.query || {};
      const payload = await dashboardService.getDashboardMobile({
        latitude: lat || req.headers['x-latitude'],
        longitude: lng || req.headers['x-longitude'],
        shopId: shop_id || null,
        radiusKm: radius ? Number(radius) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      return sendSuccess(res, payload, 'Dashboard fetched successfully');
    } catch (err) {
      return sendError(res, 'Failed to fetch dashboard', 500, { error: err.message });
    }
  }
}

export default new DashboardController();
