import net from 'node:net';

import app from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

const REQUESTED_PORT = Number(config.port) || 5001;
const MAX_PORT_SEARCH = 20;

const checkPortAvailability = (port) =>
  new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(error);
      }
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port);
  });

const findOpenPort = async (preferredPort) => {
  let port = preferredPort;
  for (let attempts = 0; attempts < MAX_PORT_SEARCH; attempts += 1) {
    // Try consecutive ports until one is available or attempts are exhausted.
    const isAvailable = await checkPortAvailability(port);
    if (isAvailable) {
      return port;
    }
    port += 1;
  }
  throw new Error(`Could not find an open port after checking ${MAX_PORT_SEARCH} consecutive ports`);
};

const startServer = async () => {
  try {
    const port = await findOpenPort(REQUESTED_PORT);
    if (port !== REQUESTED_PORT) {
      logger.warn('Requested port in use, switched to a free port', {
        requestedPort: REQUESTED_PORT,
        assignedPort: port,
      });
    }

    const server = app.listen(port, () => {
      logger.info('Server started successfully', {
        port,
        environment: config.nodeEnv,
      });
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API: http://localhost:${port}/api`);
      console.log(`💚 Health: http://localhost:${port}/api/health`);
    });

    server.on('error', (error) => {
      logger.error('Server failed after initial startup', {
        port,
        error: error.message,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      requestedPort: REQUESTED_PORT,
      error: error.message,
    });
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
