import { lazy, Suspense } from 'react';
import { SuspenseFallback, FeatureSuspense } from '../components/common/SuspenseFallback';

/**
 * Enhanced lazy loading util with better error handling
 * Automatically wraps components with Suspense boundaries
 */

/**
 * Lazy load a page component
 * Usage: const HomePage = lazyPage(() => import('../pages/Home'))
 */
export const lazyPage = (importFunc, fallback = <SuspenseFallback />) => {
  const Component = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Lazy load a feature component with custom loading indicator
 * Usage: const CartModal = lazyFeature(() => import('../modals/CartModal'), 'Cart')
 */
export const lazyFeature = (importFunc, featureName = 'Feature') => {
  const Component = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={<FeatureSuspense featureName={featureName} />}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Dynamically import components that might be heavy
 * Useful for modals, dialogs, and feature-specific screens
 */
export const dynamicImport = async (importFunc) => {
  try {
    return await importFunc();
  } catch (error) {
    console.error('Failed to load component:', error);
    throw error;
  }
};

export default lazyPage;
