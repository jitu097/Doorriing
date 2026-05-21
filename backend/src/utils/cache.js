import { logger } from './logger.js';

/**
 * Simple in-memory cache with TTL support
 * Can be easily replaced with Redis later
 */
class CacheManager {
  constructor() {
    this.store = new Map();
    // Setup a single background cleanup interval running every 60 seconds
    this.sweepInterval = setInterval(() => {
      this.sweep();
    }, 60000);
    // unref allows Node process to exit even if interval is active
    if (this.sweepInterval && typeof this.sweepInterval.unref === 'function') {
      this.sweepInterval.unref();
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default 5 min)
   */
  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiresAt });
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      logger.debug(`Cache expired on get: ${key}`);
      return undefined;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      logger.debug(`Cache expired on has: ${key}`);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Sweep expired keys from the store
   */
  sweep() {
    const now = Date.now();
    let sweptCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        sweptCount++;
      }
    }
    if (sweptCount > 0) {
      logger.debug(`Cache sweep cleaned up ${sweptCount} expired entries`);
    }
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
