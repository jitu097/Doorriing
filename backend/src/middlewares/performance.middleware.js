import { logger } from '../utils/logger.js';

/**
 * Performance monitoring middleware
 * Tracks request/response times and metrics
 */
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startCpuUsage = process.cpuUsage();

  // Store original end method
  const originalEnd = res.end;

  // Override res.end to capture response metrics
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const endCpuUsage = process.cpuUsage(startCpuUsage);

    // Calculate metrics
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1_000_000;
    const cpuUserMs = endCpuUsage.user / 1000;
    const cpuSystemMs = endCpuUsage.system / 1000;

    // Attach metrics to response
    res.metrics = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
      cpuUserMs: cpuUserMs.toFixed(2),
      cpuSystemMs: cpuSystemMs.toFixed(2),
      contentLength: res.getHeader('content-length') || 0,
      contentEncoding: res.getHeader('content-encoding') || 'none',
      timestamp: new Date().toISOString(),
    };

    // Log slow requests (> 100ms)
    if (durationMs > 100) {
      logger.warn('Slow request detected', res.metrics);
    } else if (durationMs > 50) {
      logger.debug('Request completed', res.metrics);
    }

    // Store metrics in res for access in route handlers
    req.metrics = res.metrics;

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * Response time middleware
 * Adds X-Response-Time header
 */
export const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();

  // Use prefinish to set header before response ends
  res.on('prefinish', () => {
    const duration = Date.now() - start;
    // Only set header if not already sent
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
  });

  next();
};

export default performanceMonitor;
