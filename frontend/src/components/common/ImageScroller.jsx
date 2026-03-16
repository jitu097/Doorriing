import React, { useRef, useState } from 'react';
import './ImageScroller.css';

const images = [
   '/two.png', 
  '/one.png',
 
  '/three.jpeg',
  '/four.png',
];

const ImageScroller = () => {
  const [current, setCurrent] = useState(0);
  const scrollerRef = useRef(null);
  const touchStartX = useRef(null);

  // Auto-scroll functionality
  React.useEffect(() => {
    const autoScrollInterval = setInterval(() => {
      setCurrent((prev) => {
        // Go to next image, or loop back to first
        return prev === images.length - 1 ? 0 : prev + 1;
      });
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(autoScrollInterval);
  }, []);

  // Handle swipe for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 40 && current > 0) setCurrent(current - 1);
    else if (diff < -40 && current < images.length - 1) setCurrent(current + 1);
    touchStartX.current = null;
  };

  // Scroll to current image
  React.useEffect(() => {
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
            <img src={img} alt={`slide-${idx+1}`} className="scroller-img" />
          </div>
        ))}
      </div>
      <div className="scroller-dots">
        {images.map((_, idx) => (
          <span
            key={idx}
            className={idx === current ? 'dot active' : 'dot'}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
      <button
        className="scroller-arrow left"
        onClick={() => setCurrent(Math.max(0, current - 1))}
        disabled={current === 0}
      >&#8592;</button>
      <button
        className="scroller-arrow right"
        onClick={() => setCurrent(Math.min(images.length - 1, current + 1))}
        disabled={current === images.length - 1}
      >&#8594;</button>
    </div>
  );
};

export default ImageScroller;
