import compression from 'compression';
import zlib from 'zlib';
import { logger } from '../utils/logger.js';

/**
 * Custom compression middleware with performance tracking
 * Supports: gzip, deflate, br (brotli)
 */
export const createCompressionMiddleware = () => {
  // Gzip fallback compression (Compresses responses over 1KB)
  const gzipMiddleware = compression({
    threshold: 1024,
    level: 6,
  });

  return (req, res, next) => {
    // Check if client supports brotli
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('br')) {
      return gzipMiddleware(req, res, next);
    }

    const chunks = [];
    const originalWrite = res.write;
    const originalEnd = res.end;
    const originalWriteHead = res.writeHead;

    // Override writeHead to set Content-Encoding
    res.writeHead = function (statusCode, ...args) {
      if (statusCode === 204 || statusCode === 304) {
        return originalWriteHead.apply(res, [statusCode, ...args]);
      }
      
      const cacheControl = res.getHeader('Cache-Control');
      if (cacheControl && cacheControl.includes('no-transform')) {
        return originalWriteHead.apply(res, [statusCode, ...args]);
      }

      res.setHeader('Content-Encoding', 'br');
      res.removeHeader('Content-Length');

      return originalWriteHead.apply(res, [statusCode, ...args]);
    };

    // Override write
    res.write = function (chunk, encoding, callback) {
      if (res.headersSent) {
        return originalWrite.call(res, chunk, encoding, callback);
      }
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return true;
    };

    // Override end
    res.end = function (chunk, encoding, callback) {
      if (res.headersSent) {
        return originalEnd.call(res, chunk, encoding, callback);
      }

      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const buffer = Buffer.concat(chunks);

      // If response shouldn't be compressed
      if (res.statusCode === 204 || res.statusCode === 304 || (res.getHeader('Cache-Control') || '').includes('no-transform')) {
        if (!res.headersSent) {
          originalWriteHead.call(res, res.statusCode);
        }
        originalWrite.call(res, buffer);
        return originalEnd.call(res, undefined, undefined, callback);
      }

      zlib.brotliCompress(buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Quality level 4: balances compression speed and size perfectly for live APIs
        }
      }, (err, compressed) => {
        if (err) {
          logger.error('Brotli compression failed, falling back to uncompressed', err);
          res.removeHeader('Content-Encoding');
          if (!res.headersSent) {
            originalWriteHead.call(res, res.statusCode);
          }
          originalWrite.call(res, buffer);
          return originalEnd.call(res, undefined, undefined, callback);
        }

        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Content-Length', compressed.length);

        if (!res.headersSent) {
          originalWriteHead.call(res, res.statusCode);
        }

        originalWrite.call(res, compressed);
        return originalEnd.call(res, undefined, undefined, callback);
      });
    };

    next();
  };
};
