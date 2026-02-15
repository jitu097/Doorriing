import { firebaseAuth } from '../config/firebaseAdmin.js';
import { supabase } from '../config/supabaseClient.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token required', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Fetch customer from database
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, firebase_uid, email, full_name, phone')
      .eq('firebase_uid', firebaseUid)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Database error while fetching customer', { error, firebaseUid });
      return sendError(res, 'Authentication failed', 401);
    }

    // Attach user info to request
    req.user = {
      firebaseUid,
      customerId: customer?.id || null,
      email: decodedToken.email,
      customer,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    
    if (error.code === 'auth/id-token-expired') {
      return sendError(res, 'Token expired', 401);
    }
    
    return sendError(res, 'Invalid token', 401);
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  return authenticate(req, res, next);
};
