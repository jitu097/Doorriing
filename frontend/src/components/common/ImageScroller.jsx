import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ImageScroller.css';

const images = [
   '/two.webp', 
  '/one.webp',
 
  '/three.webp',
  '/image.webp',
];

const ImageScroller = () => {
  const [current, setCurrent] = useState(0);
  const scrollerRef = useRef(null);
  const touchStartX = useRef(null);
  const currentRef = useRef(current);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  // Auto-scroll functionality
  useEffect(() => {
    let autoScrollInterval = null;

    const startAutoScroll = () => {
      if (autoScrollInterval || document.visibilityState !== 'visible') return;
      autoScrollInterval = setInterval(() => {
        setCurrent((prev) => {
          // Go to next image, or loop back to first
          return prev === images.length - 1 ? 0 : prev + 1;
        });
      }, 3000); // Change slide every 3 seconds
    };

    const stopAutoScroll = () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    };

    startAutoScroll();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopAutoScroll();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle swipe for mobile
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    const currentIndex = currentRef.current;
    if (diff > 40 && currentIndex > 0) setCurrent(currentIndex - 1);
    else if (diff < -40 && currentIndex < images.length - 1) setCurrent(currentIndex + 1);
    touchStartX.current = null;
  }, []);

  // Scroll to current image
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({
        left: scrollerRef.current.offsetWidth * current,
        behavior: 'smooth',
      });
    }
  }, [current]);

  return (
    <div className="image-scroller-wrapper">
      <div
        className="image-scroller"
        ref={scrollerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((img, idx) => (
          <div className="scroller-img-container" key={idx}>
            <img src={img} alt={`slide-${idx+1}`} className="scroller-img" loading={idx === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={idx === 0 ? 'high' : 'low'} draggable="false" />
          </div>
        ))}
      </div>
      {/* Removed scroller dots */}
      {/* Removed scroller arrows */}
    </div>
  );
};

export default ImageScroller;
