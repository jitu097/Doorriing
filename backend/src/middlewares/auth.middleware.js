import { firebaseAuth } from '../config/firebaseAdmin.js';
import { supabase } from '../config/supabaseClient.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('[Auth Debug] req.headers.authorization:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token required or malformed', 401);
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
      logger.error('Database error while fetching customer in auth middleware', {
        error_message: error.message,
        error_code: error.code,
        firebaseUid
      });
      // Surface DB error message slightly so we know it's a DB issue, not a token issue
      return res.status(500).json({ success: false, message: 'Authentication failed due to database error', raw: error.message });
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

  // Intercept the token and try to verify, but don't fail if invalid/expired
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    const { data: customer } = await supabase
      .from('customers')
      .select('id, firebase_uid, email, full_name, phone')
      .eq('firebase_uid', firebaseUid)
      .single();

    req.user = {
      firebaseUid,
      customerId: customer?.id || null,
      email: decodedToken.email,
      customer,
    };
  } catch (error) {
    // For optionalAuth, we simply ignore token errors and act as anonymous
    // But we need to log if it's a DB timeout versus a bad token
    logger.warn('optionalAuth warning, invalid token or DB timeout swallowed', {
      error_message: error.message,
      error_code: error?.code,
      stack: error.stack
    });
    req.user = null;
  }

  next();
};
