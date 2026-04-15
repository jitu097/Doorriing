import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import admin, { isFirebaseAdminConfigured } from './config/firebaseAdmin.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { logger } from './utils/logger.js';
import { createCompressionMiddleware } from './middlewares/compression.middleware.js';
import { performanceMonitor, responseTimeMiddleware } from './middlewares/performance.middleware.js';

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://doorriing.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware - Compression (must be early in stack)
app.use(createCompressionMiddleware());

// Middleware - CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware - Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware - Performance monitoring
app.use(performanceMonitor);
app.use(responseTimeMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// 🔥 ROOT ROUTE - Test if server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// 🔥 HEALTH CHECK ROUTE - Production monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// FCM debug route for direct device token validation
app.post('/test-push', async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ success: false, error: 'token is required' });
  }

  if (!isFirebaseAdminConfigured) {
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin is not configured on server',
    });
  }

  try {
    const response = await admin.messaging().send({
      token,
      notification: {
        title: 'Test Notification',
        body: 'If you see this, FCM is working',
      },
      data: {
        type: 'test',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'default_channel',
        },
      },
    });

    console.log('FCM SUCCESS:', response);
    return res.json({ success: true, response });
  } catch (error) {
    console.error('FCM ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
