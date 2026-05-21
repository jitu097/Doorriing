export const runWhenIdle = (callback, timeout = 1500) => {
  if (typeof window === 'undefined') {
    return null;
  }

  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }

  return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), Math.min(timeout, 500));
};

export const cancelIdleRun = (handle) => {
  if (typeof window === 'undefined' || handle == null) {
    return;
  }

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

export const runAfterFrame = (callback) => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
};

export const cancelAfterFrame = (handle) => {
  if (typeof window !== 'undefined' && handle != null) {
    window.cancelAnimationFrame(handle);
  }
};

export const isPageVisible = () => (
  typeof document === 'undefined' || document.visibilityState === 'visible'
);
