import shopService from '../shop/shop.service.js';
import homeService from '../home/home.service.js';
import platformService from '../platform/platform.service.js';
import { supabase } from '../../config/supabaseClient.js';
import { cacheManager as simpleCache } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

// Local in-process pending map to dedupe concurrent dashboard builds
const pending = new Map();

class DashboardService {
  /**
   * Build a mobile-optimized dashboard payload.
   * Accepts optional lat/lng for nearby shops and optional shopId for shop-scoped categories.
   */
  async getDashboardMobile({ latitude, longitude, shopId, radiusKm = 5, limit = 6 } = {}) {
    // Build a cache key based on rounded coordinates to avoid excessive cache fragmentation
    const latKey = latitude ? parseFloat(latitude).toFixed(3) : 'null';
    const lngKey = longitude ? parseFloat(longitude).toFixed(3) : 'null';
    const key = `mobile:${latKey}:${lngKey}:${shopId || 'any'}:${limit}`;

    // Dedupe concurrent builds
    if (pending.has(key)) {
      logger.debug('Reusing pending dashboard build', { key });
      return pending.get(key);
    }

    const p = (async () => {
      try {
        // Categories (critical) - try shop-scoped if shopId provided, else fetch global-ish categories
        const categoriesPromise = (async () => {
          try {
            if (shopId) {
              // Reuse existing category service if available
              const categoryModule = await import('../category/category.service.js');
              return categoryModule.default.getCategoriesByShop(shopId);
            }

            // Fallback: fetch categories with no shop association (site-wide categories)
            const { data, error } = await supabase
              .from('categories')
              .select('id, name, image_url')
              .is('shop_id', null)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })
              .order('name', { ascending: true });

            if (error) {
              logger.warn('Failed to fetch global categories for dashboard', { error });
              return [];
            }

            return data || [];
          } catch (err) {
            logger.warn('Categories fetch failed', { err: err.message });
            return [];
          }
        })();

        // Nearby shops (critical) - use shopService but request a lower ttl via options
        const nearbyPromise = (async () => {
          try {
            if (latitude && longitude) {
              // call shopService.getNearbyShops with a short TTL option if supported
              const shopModule = await import('../shop/shop.service.js');
              if (typeof shopModule.default.getNearbyShops === 'function') {
                // prefer passing options { ttlSeconds: 60 } if implementation supports it
                try {
                  return await shopModule.default.getNearbyShops(latitude, longitude, radiusKm, null, { ttlSeconds: 60 });
                } catch (e) {
                  // fallback to default call
                  return await shopModule.default.getNearbyShops(latitude, longitude, radiusKm);
                }
              }
            }
            return [];
          } catch (err) {
            logger.warn('Nearby shops fetch failed', { err: err.message });
            return [];
          }
        })();

        // Featured / home items (non-blocking but usually cached)
        const featuredPromise = (async () => {
          try {
            const homeModule = await import('../home/home.service.js');
            const items = await homeModule.default.getHomeItems(limit);
            return items || { grocery_items: [], restaurant_items: [] };
          } catch (err) {
            logger.warn('Home items fetch failed', { err: err.message });
            return { grocery_items: [], restaurant_items: [] };
          }
        })();

        // Platform settings (availability) - quick
        const platformPromise = (async () => {
          try {
            const platform = await platformService.getPlatformSettings();
            return platform;
          } catch (err) {
            logger.warn('Platform settings fetch failed', { err: err.message });
            return null;
          }
        })();

        // Kick off all in parallel
        const [categories, nearbyShops, featured, platform] = await Promise.all([
          categoriesPromise,
          nearbyPromise,
          featuredPromise,
          platformPromise,
        ]);

        // Compose compact payload with only essential fields for first paint
        const payload = {
          categories: (categories || []).map((c) => ({ id: c.id, name: c.name, image_url: c.image_url })),
          nearby_shops: (nearbyShops || []).slice(0, 12),
          featured_items: {
            grocery: (featured.grocery_items || []).slice(0, 8),
            restaurant: (featured.restaurant_items || []).slice(0, 8),
          },
          banners: [],
          recommendations: [],
          platform_settings: platform,
          meta: {
            cached: false,
            generated_at: new Date().toISOString(),
          },
        };

        // Cache the composed payload in a simple cache for a short TTL to speed repeated requests
        try {
          simpleCache.set(`dashboard_${key}`, payload, 20); // 20s
        } catch (e) {
          // ignore cache errors
        }

        return payload;
      } finally {
        pending.delete(key);
      }
    })();

    pending.set(key, p);
    return p;
  }
}

export default new DashboardService();
