import { logger } from './logger.js';

/**
 * Simple in-memory cache with TTL support
 * Can be easily replaced with Redis later
 */
class CacheManager {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default 5 min)
   */
  set(key, value, ttlSeconds = 300) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.store.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
      logger.debug(`Cache expired: ${key}`);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const value = this.store.get(key);
    if (value !== undefined) {
      logger.debug(`Cache hit: ${key}`);
    }
    return value;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.store.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.store.clear();
    this.timers.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      keys: this.store.size,
      items: Array.from(this.store.keys()),
    };
  }
}

export const cacheManager = new CacheManager();
