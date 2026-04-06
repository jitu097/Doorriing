
import React, { useEffect } from "react";
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
        delay: reducedMotion ? 0 : i * 0.12, // Reduced from 0.20s to 0.12s
        type: "spring",
        stiffness: reducedMotion ? 1 : 100, // Reduced from 120 to 100 for smoother
        damping: reducedMotion ? 1 : 12, // Reduced from 10 to 12 for more damping
        duration: reducedMotion ? 0.01 : undefined,
      },
    };
  },
};

const shops = [
  { src: "/shop1.png", className: "shop grocery", label: "Grocery" },
  { src: "/shop2.png", className: "shop restaurant", label: "Restaurant" },
  { src: "/shop3.png", className: "shop hotel", label: "Hotel" },
  { src: "/shop4.png", className: "shop dairy", label: "Dairy" },
  { src: "/shop5.png", className: "shop electric", label: "Electric" },
  { src: "/shop4.png", className: "shop cosmetic", label: "Cosmetic" },
];

export default function LoadingScreen() {
  useEffect(() => {
    // Enable GPU acceleration for loading screen
    const container = document.querySelector('.loading-screen-map');
    if (container) {
      enableGPUAcceleration(container);
      container.classList.add('framer-motion-optimized');
    }
  }, []);

  return (
    <div className="loading-screen-map">
      <div className="title" style={{lineHeight: 1.2, marginBottom: '20px'}}>
        <span style={{display: 'block'}}>From local shops to your doorstep</span>
      
        <span style={{display: 'block', color: '#ff4d4f', fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.3em'}}>DOORRIING</span>
      </div>
      <div className="map-container">
        <img src="/map.png" className="map-bg" alt="Map" loading="lazy" />
        {shops.map((shop, i) => (
          <motion.img
            key={shop.className}
            src={shop.src}
            className={`${shop.className} gpu-optimized`}
            custom={i + 1}
            variants={drop}
            initial="hidden"
            animate="visible"
            alt={shop.label}
            loading="lazy"
            style={{ willChange: 'transform, opacity' }}
          />
        ))}
      </div>
    </div>
  );
}

