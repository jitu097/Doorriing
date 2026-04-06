import { logger } from '../utils/logger.js';

/**
 * In-Memory Cache with TTL Support
 * Tracks cache hits, misses, and performance metrics
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
    };
    this.maxSize = 100; // Max number of cache entries
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

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set cache value
    this.cache.set(key, value);
    this.stats.writes++;

    // Set auto-expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
      logger.debug('Cache entry expired', { key, ttl: ttlSeconds });
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);

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

    if (this.cache.has(key)) {
      this.stats.hits++;
      logger.debug('Cache hit', { key });
      return this.cache.get(key);
    }

    this.stats.misses++;
    logger.debug('Cache miss', { key });
    return null;
  }

  /**
   * Check if value exists in cache
   */
  has(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    return this.cache.has(key);
  }

  /**
   * Delete specific cache entry
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
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
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
    logger.info('Entire cache cleared', { entriesCleared: size });
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
    for (const value of this.cache.values()) {
      size += JSON.stringify(value).length;
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
