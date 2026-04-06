import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from "lottie-react";
import foodAnimation from "../../assets/food.json";
import { enableGPUAcceleration, optimizeLottieAnimation, prefersReducedMotion } from "../../utils/animationOptimization";
import './RestaurantLanding.css';

const RestaurantLanding = () => {
  const navigate = useNavigate();
  const lottieRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    // Stage 6: Enable GPU acceleration
    if (containerRef.current) {
      enableGPUAcceleration(containerRef.current);
      containerRef.current.classList.add('lottie-container-optimized');
    }

    // Stage 6: Optimize Lottie playback based on device
    if (lottieRef.current && !prefersReducedMotion()) {
      optimizeLottieAnimation(lottieRef.current);
    }

    // Auto-navigate after animation completes (reduced from 5s to 4.5s)
    const timer = setTimeout(() => {
      navigate('/restaurant/browse');
    }, 4500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="restaurant-landing-page gpu-optimized"
      ref={containerRef}
    >
      <Lottie 
        lottieRef={lottieRef}
        animationData={foodAnimation} 
        loop={true}
        autoplay={true}
        style={{ width: 300, height: 300, willChange: 'opacity' }}
      />
    </div>
  );
};

export default RestaurantLanding;