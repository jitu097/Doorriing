import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion, enableGPUAcceleration } from "../../utils/animationOptimization";
import "./LoadingScreen.css";

// Keep the splash, but start the fall quickly once the map is ready.
const START_ANIMATION_DELAY_MS = 60;
const POST_DROP_HOLD_MS = 1000;
const drop = {
  hidden: { y: -200, opacity: 0, scale: 0.8 },
  visible: (i) => {
    const reducedMotion = prefersReducedMotion();
    
    return {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0, // All shops drop at the same time
        type: "spring",
        stiffness: reducedMotion ? 1 : 180,
        damping: reducedMotion ? 1 : 10,
        duration: reducedMotion ? 0.01 : undefined,
      },
    };
  },
};

const shops = [
  { src: "/shop1.webp", className: "shop grocery", label: "Grocery" },
  { src: "/shop2.webp", className: "shop restaurant", label: "Restaurant" },
  { src: "/shop3.webp", className: "shop hotel", label: "Hotel" },
  { src: "/shop4.webp", className: "shop dairy", label: "Dairy" },
  { src: "/shop5.webp", className: "shop electric", label: "Electric" },
  { src: "/shop4.webp", className: "shop cosmetic", label: "Cosmetic" },
];

export default function LoadingScreen({ onReady }) {
  const [allLoaded, setAllLoaded] = useState(false);
  const onReadyTimerRef = useRef(null);

  useEffect(() => {
    // Enable GPU acceleration for loading screen
    const container = document.querySelector('.loading-screen-map');
    if (container) {
      enableGPUAcceleration(container);
      container.classList.add('framer-motion-optimized');
    }
  }, []);

  useEffect(() => {
    // Start the animation as soon as the map is ready. Don't wait for every shop image.
    let mounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (!mounted) return;
      window.requestAnimationFrame(() => setAllLoaded(true));
    }, START_ANIMATION_DELAY_MS);

    try {
      const mapImage = new Image();
      mapImage.decoding = 'async';
      mapImage.loading = 'eager';
      mapImage.src = '/map.webp';

      const startAnimation = () => {
        if (!mounted) return;
        window.clearTimeout(fallbackTimer);
        window.requestAnimationFrame(() => setAllLoaded(true));
      };

      if (mapImage.complete) {
        startAnimation();
      } else {
        mapImage.onload = startAnimation;
        mapImage.onerror = startAnimation;
      }
    } catch (e) {
      window.clearTimeout(fallbackTimer);
      if (mounted) {
        window.requestAnimationFrame(() => setAllLoaded(true));
      }
    }

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (allLoaded && typeof onReady === 'function') {
      if (onReadyTimerRef.current) {
        clearTimeout(onReadyTimerRef.current);
      }

      onReadyTimerRef.current = window.setTimeout(() => {
        onReady();
      }, POST_DROP_HOLD_MS);
    }
    return () => {
      if (onReadyTimerRef.current) {
        clearTimeout(onReadyTimerRef.current);
      }
    };
  }, [allLoaded, onReady]);

  return (
    <div className="loading-screen-map">
      <div className="title" style={{lineHeight: 1.2, marginBottom: '20px'}}>
        <span style={{display: 'block'}}>From local shops to your doorstep</span>
      
        <span style={{display: 'block', color: '#ff4d4f', fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.3em'}}>DOORRIING</span>
      </div>
      <div className="map-container">
        <img src="/map.webp" className="map-bg" alt="Map" loading="eager" decoding="async" fetchPriority="high" />
        {shops.map((shop, i) => (
          <motion.img
            key={shop.className}
            src={shop.src}
            className={`${shop.className} gpu-optimized`}
            custom={i + 1}
            variants={drop}
            initial="hidden"
            animate={allLoaded ? "visible" : "hidden"}
            alt={shop.label}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{ willChange: 'transform, opacity' }}
          />
        ))}
      </div>
    </div>
  );
}