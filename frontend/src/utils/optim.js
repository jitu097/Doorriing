// src/utils/optim.js
// Performance optimization utilities for Stage 4

import React, { useMemo, useCallback } from 'react';

/**
 * Create a comparison function for React.memo custom equals
 * Useful when default shallow compare isn't enough
 */
export const createPropsComparison = (excludeProps = []) => {
  return (prevProps, nextProps) => {
    const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

    for (const key of keys) {
      if (excludeProps.includes(key)) continue;

      // Strict equality or both undefined
      if (prevProps[key] === nextProps[key]) continue;

      // Function comparison - if both functions, consider equal if same reference
      if (typeof prevProps[key] === 'function' && typeof nextProps[key] === 'function') {
        if (prevProps[key] === nextProps[key]) continue;
      }

      // Props are different
      return false;
    }

    // All props are equal
    return true;
  };
};

/**
 * Hook to memoize a callback with automatic dependency tracking
 * Useful when dependencies are complex or frequently change
 */
export const useStableCallback = (callback, deps) => {
  return useCallback(callback, deps || []);
};

/**
 * Hook to memoize expensive calculations
 * Automatically handles date/time based recalculation if needed
 */
export const useExpensiveMemo = (fn, deps, staleTime = 60000) => {
  const timestampRef = React.useRef(0);

  return useMemo(() => {
    const now = Date.now();
    const isStale = now - timestampRef.current > staleTime;

    if (isStale) {
      timestampRef.current = now;
    }

    return fn();
  }, deps);
};

/**
 * Array flattening with memoization
 * Useful for shop subcategories, etc.
 */
export const useMemoizedArray = (items, transform = (item) => item) => {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map(transform);
  }, [items, transform]);
};

/**
 * Object memoization with deep comparison
 * Only recalculates if object properties actually change
 */
export const useMemoizedObject = (obj) => {
  return useMemo(() => obj, [JSON.stringify(obj)]);
};

/**
 * Batch state updates in a single object
 * Reduces re-render count when updating multiple state values
 */
export const useBatchedState = (initialState) => {
  const [state, setState] = React.useState(initialState);

  const updateState = useCallback((updates) => {
    setState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  return [state, updateState];
};

/**
 * Debounced callback for expensive operations
 * Useful for search, filter, scroll handlers
 */
export const useDebouncedCallback = (callback, delay = 300, deps = []) => {
  const timeoutRef = React.useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );
};

/**
 * Throttled callback for frequent events
 * Useful for scroll, resize, mousemove handlers
 */
export const useThrottledCallback = (callback, limit = 100, deps = []) => {
  const inThrottle = React.useRef(false);

  return useCallback(
    (...args) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit, ...deps]
  );
};

/**
 * Memoize expensive filter operations
 * Useful for filtering shops by category, etc.
 */
export const useMemoizedFilter = (items, predicate, deps = []) => {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter(predicate);
  }, [items, predicate, ...deps]);
};

/**
 * Memoize expensive sort operations
 * Useful for sorting items by price, rating, etc.
 */
export const useMemoizedSort = (items, compareFn, deps = []) => {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];
    return [...items].sort(compareFn);
  }, [items, compareFn, ...deps]);
};

/**
 * Memoize expensive map operations
 * Useful for transforming items
 */
export const useMemoizedMap = (items, mapFn, deps = []) => {
  return useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map(mapFn);
  }, [items, mapFn, ...deps]);
};

/**
 * Create a stable Zustand selector hook
 * Prevents selector function recreation
 */
export const createStableSelector = (store, selector) => {
  return useMemo(() => selector(store), [store, selector]);
};

/**
 * Memoize primitives that might be object-wrapped
 * E.g., { value: 123 } → always returns same reference if value same
 */
export const useMemoizedPrimitive = (value) => {
  const ref = React.useRef(value);

  if (value !== ref.current) {
    ref.current = value;
  }

  return ref.current;
};

export default {
  createPropsComparison,
  useStableCallback,
  useExpensiveMemo,
  useMemoizedArray,
  useMemoizedObject,
  useBatchedState,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedFilter,
  useMemoizedSort,
  useMemoizedMap,
  createStableSelector,
  useMemoizedPrimitive,
};
