import { logger } from '../utils/logger.js';

/**
 * In-Memory Cache with TTL Support
 * Tracks cache hits, misses, and performance metrics
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
    };
    this.maxSize = 100; // Max number of cache entries

    // Setup a single background cleanup interval running every 60 seconds
    this.sweepInterval = setInterval(() => {
      this.sweep();
    }, 60000);
    if (this.sweepInterval && typeof this.sweepInterval.unref === 'function') {
      this.sweepInterval.unref();
    }
  }

  /**
   * Generate cache key
   */
  generateKey(namespace, identifier) {
    return `${namespace}:${identifier}`;
  }

  /**
   * Set value in cache with TTL
   * @param {String} namespace - Cache namespace (e.g., 'shop', 'category')
   * @param {String} identifier - Unique identifier
   * @param {Any} value - Data to cache
   * @param {Number} ttlSeconds - Time to live in seconds (default: 300 = 5 min)
   */
  set(namespace, identifier, value, ttlSeconds = 300) {
    const key = this.generateKey(namespace, identifier);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
      this.stats.evictions++;
    }

    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
    this.stats.writes++;

    logger.debug('Cache write', {
      key,
      ttl: ttlSeconds,
      cacheSize: this.cache.size,
    });
  }

  /**
   * Get value from cache
   */
  get(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);

    if (entry === undefined) {
      this.stats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache expired on get', { key });
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit', { key });
    return entry.value;
  }

  /**
   * Check if value exists in cache
   */
  has(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    const entry = this.cache.get(key);

    if (entry === undefined) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache expired on has', { key });
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache by namespace
   */
  clearNamespace(namespace) {
    let cleared = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(namespace)) {
        this.delete(key);
        cleared++;
      }
    }
    logger.info('Cache cleared by namespace', { namespace, cleared });
    return cleared;
  }

  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Entire cache cleared', { entriesCleared: size });
  }

  /**
   * Sweep expired keys
   */
  sweep() {
    const now = Date.now();
    let sweptCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        sweptCount++;
      }
    }
    if (sweptCount > 0) {
      logger.debug(`Cache sweep cleaned up ${sweptCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      totalEntries: this.cache.size,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
    };
  }

  /**
   * Estimate memory usage (rough estimate)
   */
  estimateMemoryUsage() {
    let size = 0;
    for (const entry of this.cache.values()) {
      if (entry && entry.value) {
        size += JSON.stringify(entry.value).length;
      }
    }
    return `${(size / 1024).toFixed(2)} KB`;
  }

  /**
   * Get cache info for monitoring
   */
  getInfo() {
    return {
      totalSize: this.cache.size,
      maxSize: this.maxSize,
      stats: this.getStats(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

export default cacheManager;
