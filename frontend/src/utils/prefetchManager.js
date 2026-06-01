import { getHomeShops, getShopById } from '../services/shop.service.js';
import { getCategoriesByShop } from '../services/category.service.js';
import { restoreKeys as restorePersistent } from './persistentCache';
import { isPageVisible, runWhenIdle } from './scheduler';

const MAX_PRELOAD_IMAGES = 3;

function idle(cb) {
  if (typeof window === 'undefined') return;
  runWhenIdle(cb, 2000);
}

export function startBackgroundRevalidate() {
  // Revalidate key dashboard pieces in background during idle time
  idle(async () => {
    if (!isPageVisible()) return;
    try {
      // force refresh home shops to update availability/pricing
      await getHomeShops(20, true);
    } catch (e) {
      // swallow errors — background only
      console.debug('[prefetch] background revalidate failed', e.message || e);
    }
  });
}

export function startPredictivePrefetch({ images = [] } = {}) {
  idle(() => {
    if (!isPageVisible()) return;
    // prefetch images of likely visible items
    const urls = images.slice(0, MAX_PRELOAD_IMAGES);
    urls.forEach((u, index) => {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = 'low';
      window.setTimeout(() => {
        img.src = u;
        img.decode?.().catch(() => {});
      }, index * 140);
    });
  });
}

/**
 * Prefetch details and categories for a specific shop
 * to ensure instant loading when clicked.
 */
export function prefetchShop(shopId) {
  if (!shopId) return;

  idle(async () => {
    if (!isPageVisible()) return;
    try {
      // Fetch details and categories. apiV2 handles caching automatically.
      await Promise.allSettled([
        getShopById(shopId),
        getCategoriesByShop(shopId),
      ]);
      console.log(`[prefetch] Successfully prefetched data for shop ${shopId}`);
    } catch (e) {
      console.debug(`[prefetch] Prefetch for shop ${shopId} failed`, e.message || e);
    }
  });
}

export default {
  startBackgroundRevalidate,
  startPredictivePrefetch,
  prefetchShop,
};
