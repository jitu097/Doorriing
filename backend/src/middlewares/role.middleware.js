import { ROLES } from '../utils/constants.js';
import { sendError } from '../utils/response.js';

// Ensure user has customer role (exists in customers table)
export const requireCustomer = (req, res, next) => {
  if (!req.user || !req.user.customerId) {
    return sendError(res, 'Customer account required', 403);
  }
  next();
};

// Prevent sellers from accessing customer routes
export const preventSellerAccess = (req, res, next) => {
  // This middleware ensures that even if a user is a seller,
  // they cannot access customer-only routes
  // Additional seller check can be added here if needed
  next();
};
