import authService from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

class AuthController {
  /**
   * Register or login customer
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { firebaseUid, email } = req.user;
      const { full_name, phone } = req.body;

      const result = await authService.createOrGetCustomer(
        firebaseUid,
        email,
        full_name,
        phone
      );

      return sendSuccess(
        res,
        result.customer,
        result.isNew ? 'Account created successfully' : 'Welcome back',
        result.isNew ? 201 : 200
      );
    } catch (error) {
      logger.error('Register controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req, res, next) {
    try {
      const { customerId } = req.user;

      if (!customerId) {
        return sendError(res, 'Customer account not found', 404);
      }

      const profile = await authService.getCustomerProfile(customerId);
      return sendSuccess(res, profile);
    } catch (error) {
      logger.error('GetProfile controller error', { error: error.message });
      next(error);
    }
  }

  /**
   * Update customer profile
   * PUT /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const { customerId } = req.user;
      const updates = req.body;

      if (!customerId) {
        return sendError(res, 'Customer account not found', 404);
      }

      const updated = await authService.updateCustomerProfile(customerId, updates);
      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error) {
      logger.error('UpdateProfile controller error', { error: error.message });
      next(error);
    }
  }
}

export default new AuthController();
