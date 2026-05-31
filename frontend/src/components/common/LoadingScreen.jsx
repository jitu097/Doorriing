import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion, enableGPUAcceleration } from "../../utils/animationOptimization";
import "./LoadingScreen.css";

// Keep the splash, but make it feel immediate.
const MIN_LOADING_SCREEN_MS = 120;
const POST_DROP_HOLD_MS = 250;
const drop = {
  hidden: { y: -200, opacity: 0, scale: 0.8 },
  visible: (i) => {
    const reducedMotion = prefersReducedMotion();
    const staggerDelay = reducedMotion ? 0 : (i - 1) * 0.035;
    
    return {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        delay: staggerDelay,
        type: "spring",
        stiffness: reducedMotion ? 1 : 260,
        damping: reducedMotion ? 1 : 16,
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
  const startedAtRef = useRef(Date.now());
  const onReadyTimerRef = useRef(null);

  useEffect(() => {
    startedAtRef.current = Date.now();

    // Enable GPU acceleration for loading screen
    const container = document.querySelector('.loading-screen-map');
    if (container) {
      enableGPUAcceleration(container);
      container.classList.add('framer-motion-optimized');
    }
  }, []);

  useEffect(() => {
    // Only wait on the map image; the shops should animate almost immediately.
    let mounted = true;
    const mapImage = new Image();

    const revealSoon = () => {
      if (!mounted) return;
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, MIN_LOADING_SCREEN_MS - elapsed);

      window.setTimeout(() => {
        if (!mounted) return;
        window.requestAnimationFrame(() => setAllLoaded(true));
      }, remaining);
    };

    try {
      mapImage.decoding = 'async';
      mapImage.loading = 'eager';
      mapImage.onload = revealSoon;
      mapImage.onerror = revealSoon;
      mapImage.src = '/map.png';
      if (mapImage.complete) {
        revealSoon();
      }
    } catch (e) {
      revealSoon();
    }

    shops.forEach((u) => {
      try {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = u.src;
        // Fire-and-forget: shops should not block the animation start.
      } catch (e) {
        // Ignore image preload errors; the component can still animate.
      }
    });

    return () => { mounted = false; };
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
        <img src="/map.png" className="map-bg" alt="Map" loading="eager" decoding="async" fetchPriority="high" />
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
            fetchPriority={i < 2 ? "high" : "auto"}
            style={{ willChange: 'transform, opacity' }}
          />
        ))}
      </div>
    </div>
  );
}