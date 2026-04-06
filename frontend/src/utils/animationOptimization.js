// Animation Optimization Utilities
// Stage 6: Animation & UX Performance

/**
 * requestAnimationFrame wrapper for smooth transitions
 * Prevents layout thrashing and ensures 60fps animations
 */
export const smoothTransition = (callback, duration = 300) => {
  let startTime = null;
  let frameId = null;

  const animate = (timestamp) => {
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    callback(progress);

    if (progress < 1) {
      frameId = requestAnimationFrame(animate);
    }
  };

  frameId = requestAnimationFrame(animate);

  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
};

/**
 * Detect if user prefers reduced motion
 * Important for accessibility and performance
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Apply reduced motion settings
 * Significantly improves performance for users with reduced motion preference
 */
export const applyReducedMotion = (element) => {
  if (prefersReducedMotion()) {
    element.style.setProperty('--animation-duration', '0.01ms', 'important');
    element.style.setProperty('--transition-duration', '0.01ms', 'important');
  }
};

/**
 * Enable GPU acceleration for animations
 * Add will-change to animated elements before animation starts
 */
export const enableGPUAcceleration = (element) => {
  if (!element) return;
  
  // Add GPU optimization
  element.style.willChange = 'transform, opacity';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
  element.style.transform = 'translateZ(0)';
};

/**
 * Disable GPU acceleration after animation completes
 * Free up GPU resources
 */
export const disableGPUAcceleration = (element) => {
  if (!element) return;
  
  // Remove GPU optimization after animation
  setTimeout(() => {
    element.style.willChange = 'auto';
  }, 50);
};

/**
 * Optimize Lottie animation playback
 * Reduce frame rate for better performance
 */
export const optimizeLottieAnimation = (lottieInstance) => {
  if (!lottieInstance) return;
  
  // Reduce animation framerate based on device
  const isLowPowerDevice = typeof navigator !== 'undefined' && 
    (navigator.deviceMemory < 4 || navigator.hardwareConcurrency < 2);
  
  if (isLowPowerDevice) {
    // Reduce frame rate from 60fps to 30fps
    lottieInstance.setSpeed(0.5);
  }
};

/**
 * Lazy load Lottie component
 * Only load when needed to reduce bundle size
 */
export const lazyLoadLottie = async () => {
  try {
    const lottieModule = await import('lottie-react');
    return lottieModule.default;
  } catch (error) {
    console.error('Failed to load Lottie:', error);
    return null;
  }
};

/**
 * Debounce animation triggers
 * Prevent animation spam on rapid interactions
 */
export const debounceAnimation = (callback, delay = 300) => {
  let timeoutId = null;
  let lastCallTime = 0;

  return (...args) => {
    const now = Date.now();
    
    if (now - lastCallTime < delay) {
      clearTimeout(timeoutId);
    }
    
    lastCallTime = now;
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

/**
 * Throttle animation updates
 * Limit animation frame updates to prevent jank
 */
export const throttleAnimation = (callback, limit = 16) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      callback.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Optimize animation on scroll
 * Only animate when element is in viewport
 */
export const observeAnimationTrigger = (element, callback) => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Fallback for older browsers
    callback();
    return () => {};
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      callback();
      observer.unobserve(element);
    }
  }, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  observer.observe(element);

  return () => observer.disconnect();
};

/**
 * Batch DOM animations
 * Group DOM writes together to prevent layout thrashing
 */
export const batchAnimations = async (animations) => {
  // Read phase - gather information
  const measurements = animations.map(anim => {
    requestAnimationFrame(() => {
      const rect = anim.element?.getBoundingClientRect?.();
      return { element: anim.element, ...rect };
    });
  });

  await new Promise(r => requestAnimationFrame(r));

  // Write phase - apply animations
  measurements.forEach((measure, i) => {
    requestAnimationFrame(() => {
      animations[i].animate(measure);
    });
  });
};

/**
 * Get performance-optimized animation config
 * Adjust animation complexity based on device performance
 */
export const getOptimizedAnimationConfig = () => {
  if (typeof navigator === 'undefined') {
    return { reduced: false, fps: 60 };
  }

  const isLowPower = navigator.deviceMemory < 4 || navigator.hardwareConcurrency < 2;
  const connection = navigator.connection?.effectiveType;
  
  return {
    reduced: prefersReducedMotion(),
    lowPower: isLowPower,
    slowConnection: connection === '4g' || connection === '3g',
    fps: isLowPower ? 30 : 60,
    duration: isLowPower ? 600 : 300,
    simplify: isLowPower || connection === '3g'
  };
};

/**
 * Create smooth scroll animation
 * Smooth scroll with performance optimization
 */
export const smoothScroll = (element, target, duration = 800) => {
  const start = element.scrollLeft || window.scrollX;
  const distance = target - start;
  let startTime = null;

  const scroll = (timestamp) => {
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function - ease-out-cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    element.scrollLeft = start + distance * easeProgress;
    
    if (progress < 1) {
      requestAnimationFrame(scroll);
    }
  };

  requestAnimationFrame(scroll);
};

/**
 * Optimize CSS animations
 * Auto-add GPU acceleration classes
 */
export const optimizeAnimationElements = () => {
  const animatedElements = document.querySelectorAll('[class*="animate"]');
  
  animatedElements.forEach(element => {
    enableGPUAcceleration(element);
    
    // Listen for animation end
    element.addEventListener('animationend', () => {
      disableGPUAcceleration(element);
    });
  });
};

/**
 * Preload animation resources
 * Load Lottie files and images before animation starts
 */
export const preloadAnimationResources = async (resources) => {
  const loadPromises = resources.map(resource => {
    return new Promise((resolve) => {
      if (resource.type === 'image') {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = resource.src;
      } else if (resource.type === 'json') {
        fetch(resource.src).then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    });
  });

  return Promise.all(loadPromises);
};

export default {
  smoothTransition,
  prefersReducedMotion,
  applyReducedMotion,
  enableGPUAcceleration,
  disableGPUAcceleration,
  optimizeLottieAnimation,
  lazyLoadLottie,
  debounceAnimation,
  throttleAnimation,
  observeAnimationTrigger,
  batchAnimations,
  getOptimizedAnimationConfig,
  smoothScroll,
  optimizeAnimationElements,
  preloadAnimationResources
};
