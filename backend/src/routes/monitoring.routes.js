import { Router } from 'express';
import { cacheManager } from '../utils/cache.manager.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Get cache statistics
 * GET /api/monitoring/cache
 */
router.get('/cache', (req, res) => {
  try {
    const stats = cacheManager.getInfo();
    res.json({
      success: true,
      data: stats,
      message: 'Cache statistics retrieved',
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
    });
  }
});

/**
 * Clear cache by namespace
 * DELETE /api/monitoring/cache/:namespace
 */
router.delete('/cache/:namespace', (req, res) => {
  try {
    const { namespace } = req.params;
    const cleared = cacheManager.clearNamespace(namespace);
    
    res.json({
      success: true,
      data: {
        namespace,
        entriesCleared: cleared,
        timestamp: new Date().toISOString(),
      },
      message: `Cache cleared for namespace: ${namespace}`,
    });
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
});

/**
 * Clear entire cache
 * DELETE /api/monitoring/cache
 */
router.delete('/cache', (req, res) => {
  try {
    cacheManager.clear();
    
    res.json({
      success: true,
      message: 'Entire cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to clear entire cache', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
});

/**
 * Reset cache statistics
 * POST /api/monitoring/cache/stats/reset
 */
router.post('/cache/stats/reset', (req, res) => {
  try {
    cacheManager.resetStats();
    
    res.json({
      success: true,
      message: 'Cache statistics reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset cache stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset cache statistics',
    });
  }
});

/**
 * Get performance metrics
 * GET /api/monitoring/performance
 */
router.get('/performance', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    success: true,
    data: {
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      uptime: `${uptime.toFixed(2)} seconds`,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
