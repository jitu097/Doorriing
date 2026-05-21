import { create } from 'zustand';

/**
 * STAGE 5.1: Client-side request caching with Zustand
 * Manages query cache with TTL support
 * - Cache stores API responses with timestamps
 * - TTL automatically invalidates stale data
 * - Tracks cache hits/misses for analytics
 * - STEP 5: Automatic periodic eviction prevents unbounded memory growth
 */
export const useQueryCache = create((set, get) => ({
  // Cache store: { cacheKey: { data, timestamp, ttl } }
  cache: new Map(),
  
  // Pending requests for deduplication
  pendingRequests: new Map(),
  
  // Cache statistics
  stats: {
    hits: 0,
    misses: 0,
    sets: 0,
  },

  /**
   * 5.1 - Get data from cache
   * Returns null if expired or not found
   */
  getCached: (key) => {
    const entry = get().cache.get(key);
    
    if (!entry) {
      set((state) => ({
        stats: { ...state.stats, misses: state.stats.misses + 1 }
      }));
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      get().removeCache(key);
      set((state) => ({
        stats: { ...state.stats, misses: state.stats.misses + 1 }
      }));
      return null;
    }

    // Cache hit!
    set((state) => ({
      stats: { ...state.stats, hits: state.stats.hits + 1 }
    }));
    
    return entry.data;
  },

  /**
   * 5.1 - Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  setCache: (key, data, ttlMs = 5 * 60 * 1000) => {
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
      return {
        cache: newCache,
        stats: { ...state.stats, sets: state.stats.sets + 1 }
      };
    });
  },

  /**
   * 5.1 - Remove specific cache entry
   */
  removeCache: (key) => {
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.delete(key);
      return { cache: newCache };
    });
  },

  /**
   * 5.1 - Clear cache by namespace
   * @param {string} namespace - e.g., 'shop', 'items', 'orders'
   */
  clearNamespace: (namespace) => {
    set((state) => {
      const newCache = new Map(state.cache);
      for (const key of newCache.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          newCache.delete(key);
        }
      }
      return { cache: newCache };
    });
  },

  /**
   * 5.1 - Clear entire cache
   */
  clearCache: () => {
    set({ cache: new Map() });
  },

  /**
   * 5.2 - Track pending requests for deduplication
   * If same request is made before first completes, return pending promise
   */
  getPending: (key) => {
    return get().pendingRequests.get(key);
  },

  /**
   * 5.2 - Set pending request
   */
  setPending: (key, promise) => {
    set((state) => {
      const newPending = new Map(state.pendingRequests);
      newPending.set(key, promise);
      return { pendingRequests: newPending };
    });
  },

  /**
   * 5.2 - Remove pending request
   */
  removePending: (key) => {
    set((state) => {
      const newPending = new Map(state.pendingRequests);
      newPending.delete(key);
      return { pendingRequests: newPending };
    });
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    return get().stats;
  },

  /**
   * Reset statistics
   */
  resetStats: () => {
    set({ stats: { hits: 0, misses: 0, sets: 0 } });
  },

  /**
   * STEP 5 — Long-session memory optimization
   * Evict all cache entries that have exceeded their TTL.
   * Called automatically by the eviction sweep interval.
   */
  evictExpired: () => {
    const now = Date.now();
    const currentCache = get().cache;
    let changed = false;

    // Build a new Map only if there are entries to remove
    const newCache = new Map(currentCache);
    for (const [key, entry] of newCache) {
      if (now - entry.timestamp > entry.ttl) {
        newCache.delete(key);
        changed = true;
      }
    }

    if (changed) {
      set({ cache: newCache });
      console.debug('[queryCache] Eviction sweep removed expired entries');
    }
  },
}));

// ── STEP 5: Automatic visibility-aware eviction sweep ────────────────────────
// Runs every 5 minutes, but ONLY while the page is visible to avoid waking
// up the CPU while the app is backgrounded (battery/thermal optimization).
const EVICTION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let _evictionIntervalId = null;

function _startEvictionSweep() {
  if (_evictionIntervalId) return;
  _evictionIntervalId = setInterval(() => {
    useQueryCache.getState().evictExpired();
  }, EVICTION_INTERVAL_MS);
}

function _stopEvictionSweep() {
  if (_evictionIntervalId) {
    clearInterval(_evictionIntervalId);
    _evictionIntervalId = null;
  }
}

// Only start the sweep if the document is available (not in SSR)
if (typeof document !== 'undefined') {
  if (document.visibilityState === 'visible') {
    _startEvictionSweep();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _startEvictionSweep();
    } else {
      _stopEvictionSweep();
    }
  });
}

export default useQueryCache;
