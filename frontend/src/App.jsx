
import { useEffect, useState } from 'react';
import { getRedirectResult } from 'firebase/auth';
import UserRoutes from './routes/UserRoutes';
import { auth } from './config/firebase';
import persistentCache from './utils/persistentCache';
import prefetchManager from './utils/prefetchManager';
import useQueryCache from './store/queryCache.store';
import LoadingScreen from './components/common/LoadingScreen';


function App() {
  const [showInitialLoading, setShowInitialLoading] = useState(true);

  useEffect(() => {
    // Skip Firebase redirect check when running inside Android WebView shell
    const isAndroidWrapper = typeof window !== 'undefined' && !!(window.AndroidAuth || window.Android);
    if (isAndroidWrapper) {
      console.log('[App] Skip Firebase redirect check in native environment');
      return;
    }

    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result?.user) {
          console.log('Google login success:', result.user);
        }
      } catch (error) {
        console.error('Google redirect error:', error);
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    // Restore persisted dashboard cache in the background without blocking first paint.
    try {
      const restored = persistentCache.restoreKeys();
      const setCache = useQueryCache.getState().setCache;
      for (const k in restored) {
        const e = restored[k];
        if (e && e.data) {
          setCache(k, e.data, e.ttl ?? (2 * 60 * 1000));
        }
      }
    } catch (e) {
      console.warn('[App] restore persistent cache failed', e);
    }

    // Let Firebase hydrate auth state in the background so protected routes can catch up later.
    auth.authStateReady().catch(() => {});
  }, []);
  // Start lightweight background revalidation and predictive prefetch after first paint.
  // STEP 5: Deferred with setTimeout(0) to yield the JS thread to React's commit phase
  // first, ensuring the first paint is not delayed by non-critical background work.
  useEffect(() => {
    const deferredTasks = setTimeout(() => {
      prefetchManager.startBackgroundRevalidate();
      // collect banner images from restored persistent cache if any
      try {
        const restored = persistentCache.restoreKeys();
        const banners = restored['dashboard:banners']?.data || [];
        const images = Array.isArray(banners) ? banners.map(b => b.image).filter(Boolean) : [];
        prefetchManager.startPredictivePrefetch({ images });
      } catch (e) {}
    }, 0);

    // Persist selected caches on visibility change to save dashboard state for reopen
    const onHide = () => {
      try {
        const cache = useQueryCache.getState().cache;
        const toPersist = {};
        const keys = ['home-shops','dashboard:categories','dashboard:nearby','dashboard:banners'];
        for (const k of keys) {
          const entry = cache.get(k);
          if (entry) toPersist[k] = entry;
        }
        if (Object.keys(toPersist).length) {
          persistentCache.persistEntries(toPersist);
        }
      } catch (e) {}
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onHide();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onHide);

    return () => {
      clearTimeout(deferredTasks);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);

  if (showInitialLoading) return <LoadingScreen onReady={() => setShowInitialLoading(false)} />;

  return <UserRoutes />;
}

export default App;
 //jitu