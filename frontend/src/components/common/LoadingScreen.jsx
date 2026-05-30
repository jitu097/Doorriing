import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion, enableGPUAcceleration } from "../../utils/animationOptimization";
import "./LoadingScreen.css";

// Stage 6: Optimized animation config
// Reduced delay per item from 0.20s to 0.12s for faster load
// Reduced stiffness for smoother animations
const drop = {
  hidden: { y: -200, opacity: 0, scale: 0.8 },
  visible: (i) => {
    const reducedMotion = prefersReducedMotion();
    
    return {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0, // All shops drop at same time
        type: "spring",
        stiffness: reducedMotion ? 1 : 100, // Reduced from 120 to 100 for smoother
        damping: reducedMotion ? 1 : 12, // Reduced from 10 to 12 for more damping
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

export default function LoadingScreen() {
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    // Enable GPU acceleration for loading screen
    const container = document.querySelector('.loading-screen-map');
    if (container) {
      enableGPUAcceleration(container);
      container.classList.add('framer-motion-optimized');
    }
  }, []);

  useEffect(() => {
    // Preload map + shop images concurrently to avoid staggered appearance
    let mounted = true;
    let loaded = 0;
    const urls = ['/map.png', ...shops.map(s => s.src)];

    const onLoaded = () => {
      loaded += 1;
      if (!mounted) return;
      if (loaded >= urls.length) {
        // small repaint before animations
        window.requestAnimationFrame(() => setAllLoaded(true));
      }
    };

    urls.forEach((u) => {
      try {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = u;
        if (img.complete) {
          onLoaded();
        } else {
          img.onload = onLoaded;
          img.onerror = onLoaded; // treat errors as loaded to avoid blocking
        }
      } catch (e) {
        onLoaded();
      }
    });

    return () => { mounted = false; };
  }, []);

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
            fetchPriority="high"
            style={{ willChange: 'transform, opacity' }}
          />
        ))}
      </div>
    </div>
  );
}