import homeService from './home.service.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class HomeController {
  async getHomeItems(req, res, next) {
    try {
      const { limit } = req.query;
      const data = await homeService.getHomeItems(limit);
      return sendSuccess(res, data, 'Home items fetched successfully');
    } catch (error) {
      logger.error('HomeController.getHomeItems error', { error: error.message });
      next(error);
    }
  }
}

export default new HomeController();
