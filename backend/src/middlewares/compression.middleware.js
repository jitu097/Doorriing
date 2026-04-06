import compression from 'compression';
import { logger } from '../utils/logger.js';

/**
 * Custom compression middleware with performance tracking
 * Supports: gzip, deflate, br (brotli)
 */
export const createCompressionMiddleware = () => {
  // Default compression with gzip (most compatible)
  const compressionMiddleware = compression({
    // Compress all responses (1 byte threshold)
    threshold: 0,
    
    // Compression level (0-9, 6 is default)
    level: 6,
  });
  
  return compressionMiddleware;
};
