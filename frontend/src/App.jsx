
import { useState, useEffect } from 'react';
import { getRedirectResult } from 'firebase/auth';
import UserRoutes from './routes/UserRoutes';
import LoadingScreen from './components/common/LoadingScreen';
import { auth } from './config/firebase';
import persistentCache from './utils/persistentCache';
import prefetchManager from './utils/prefetchManager';
import useQueryCache from './store/queryCache.store';

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 600;
}


function App() {
  const [loading, setLoading] = useState(isMobile());

  useEffect(() => {
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
    if (!isMobile()) {
      setLoading(false);
      return;
    }

    // Try to restore persisted dashboard cache for instant reopen
    try {
      const restored = persistentCache.restoreKeys();
      const setCache = useQueryCache.getState().setCache;
      let any = false;
      for (const k in restored) {
        const e = restored[k];
        if (e && e.data) {
          // restore with a safe TTL (default 2 minutes)
          setCache(k, e.data, e.ttl ?? (2 * 60 * 1000));
          any = true;
        }
      }
      if (any) {
        // show UI immediately with restored data
        setLoading(false);
      }
    } catch (e) {
      console.warn('[App] restore persistent cache failed', e);
    }

    // Wait for auth state to hydrate; ensure auth wont block long on first open
    auth.authStateReady().then(() => {
      setTimeout(() => setLoading(false), 300);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  // Toggle body scroll based on loading state
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Clean up on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [loading]);
  // Start lightweight background revalidation and predictive prefetch after first paint
  useEffect(() => {
    prefetchManager.startBackgroundRevalidate();
    // collect banner images from restored persistent cache if any
    try {
      const restored = persistentCache.restoreKeys();
      const banners = restored['dashboard:banners']?.data || [];
      const images = Array.isArray(banners) ? banners.map(b => b.image).filter(Boolean) : [];
      prefetchManager.startPredictivePrefetch({ images });
    } catch (e) {}

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
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return <UserRoutes />;
}

export default App;
 //jitu