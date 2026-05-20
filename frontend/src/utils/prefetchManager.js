import { getHomeShops } from '../services/shop.service.js';
import { restoreKeys as restorePersistent } from './persistentCache';

const MAX_PRELOAD_IMAGES = 6;

function idle(cb) {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 500);
  }
}

export function startBackgroundRevalidate() {
  // Revalidate key dashboard pieces in background during idle time
  idle(async () => {
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
    // prefetch images of likely visible items
    const urls = images.slice(0, MAX_PRELOAD_IMAGES);
    for (const u of urls) {
      const img = new Image();
      img.src = u;
    }
  });
}

export default {
  startBackgroundRevalidate,
  startPredictivePrefetch,
};
