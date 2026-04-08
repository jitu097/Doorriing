import net from 'node:net';
import http from 'node:http';

import { config } from './config/env.js';
import app from './app.js';
import { logger } from './utils/logger.js';
import { supabase } from './config/supabaseClient.js';
import { WebSocketServer } from 'ws';

const REQUESTED_PORT = Number(config.port) || 5000;
const MAX_PORT_SEARCH = 20;
const LOG_STREAM_ENABLED = process.env.LOG_STREAM_ENABLED === 'true';
const LOG_STREAM_TOKEN = process.env.LOG_STREAM_TOKEN || '';

const formatConsoleArg = (arg) => {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
  }
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch (error) {
      return '[Unserializable Object]';
    }
  }
  return String(arg);
};

const formatConsoleArgs = (args) => args.map(formatConsoleArg).join(' ');

const createLogBroadcaster = (wss) => {
  if (!wss) return null;

  const clients = new Set();

  wss.on('connection', (socket, req) => {
    if (LOG_STREAM_TOKEN) {
      try {
        const url = new URL(req.url || '/', 'http://localhost');
        const token = url.searchParams.get('token');
        if (token !== LOG_STREAM_TOKEN) {
          socket.close(1008, 'Invalid token');
          return;
        }
      } catch (error) {
        socket.close(1008, 'Invalid token');
        return;
      }
    }

    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
  });

  return (payload) => {
    if (!payload) return;
    let serialized = '';
    try {
      serialized = JSON.stringify(payload);
    } catch (error) {
      serialized = JSON.stringify({
        level: 'error',
        message: 'Failed to serialize log payload',
      });
    }

    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(serialized);
      }
    });
  };
};

const patchConsoleForLogStream = (broadcast) => {
  if (!broadcast) return;

  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  levels.forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      broadcast({
        source: 'console',
        level,
        message: formatConsoleArgs(args),
        timestamp: new Date().toISOString(),
      });
    };
  });
};

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

    const server = http.createServer(app);
    const wss = LOG_STREAM_ENABLED
      ? new WebSocketServer({ server, path: '/log-stream' })
      : null;
    const broadcastLog = createLogBroadcaster(wss);

    patchConsoleForLogStream(broadcastLog);

    server.listen(port, async () => {
      logger.info('Server started successfully', {
        port,
        environment: config.nodeEnv,
      });
      console.log(`🚀 Server running on port ${port}`);

      try {
        const { data, error } = await supabase.from('customers').select('id').limit(1);
        if (error) {
          logger.error('🔥 SUPABASE CONNECTION FAILED ON STARTUP:', { error: error.message, code: error.code });
          console.log('🔥 DATABASE ERROR:', error);
          process.exit(1);
        } else {
          logger.info('✅ Supabase connected successfully.');
        }
      } catch (err) {
        logger.error('🔥 CRITICAL SUPABASE NETWORK FAILURE:', { message: err.message, cause: err.cause, stack: err.stack });
        console.log('🔥 NETWORK TIMEOUT CONNECTING TO DB URL:', process.env.SUPABASE_URL);
        process.exit(1);
      }
    });

    server.on('error', (error) => {
      logger.error('Server failed after initial startup', {
        port,
        error: error.message,
      });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => process.exit(0));
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  console.log('--- UNCAUGHT EXCEPTION ERROR LOG ---', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});


//jitu