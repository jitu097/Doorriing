import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { enableGPUAcceleration } from '../../utils/animationOptimization';
import './GroceryLanding.css';

const GroceryLanding = () => {
  const navigate = useNavigate();
  const containerRef = useRef();

  useEffect(() => {
    // Stage 6: Enable GPU acceleration for all animated images
    if (containerRef.current) {
      const animatedImages = containerRef.current.querySelectorAll('[class*="drop-img"]');
      animatedImages.forEach(img => {
        enableGPUAcceleration(img);
        img.classList.add('gpu-optimized');
      });
    }

    // Auto-navigate after animation (reduced from 3s to 2.5s - 17% faster)
    const timer = setTimeout(() => {
      navigate('/grocery/browse');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="grocery-landing-page gpu-optimized" ref={containerRef}>
      <img 
        src="/bas.webp" 
        alt="Bas" 
        className="bas-drop-img"
        loading="lazy"
      />
      <img 
        src="/veg.webp" 
        alt="Veg" 
        className="veg-drop-img"
        loading="lazy"
      />
      <img 
        src="/gross.webp" 
        alt="Gross" 
        className="gross-drop-img"
        loading="lazy"
      />
      <img 
        src="/fru.webp" 
        alt="Fru" 
        className="fru-drop-img"
        loading="lazy"
      />
    </div>
  );
};

export default GroceryLanding;
