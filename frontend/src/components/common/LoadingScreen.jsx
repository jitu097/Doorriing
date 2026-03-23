
import React from "react";
import { motion } from "framer-motion";
import "./LoadingScreen.css";

const drop = {
  hidden: { y: -200, opacity: 0, scale: 0.8 },
  visible: (i) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.20,
      type: "spring",
      stiffness: 120,
      damping: 10,
    },
  }),
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
  return (
    <div className="loading-screen-map">
      <div className="title" style={{lineHeight: 1.2, marginBottom: '20px'}}>
        <span style={{display: 'block'}}>From local shops to your doorstep</span>
      
        <span style={{display: 'block', color: '#ff4d4f', fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.3em'}}>DOORRIING</span>
      </div>
      <div className="map-container">
        <img src="/map.png" className="map-bg" alt="Map" />
        {shops.map((shop, i) => (
          <motion.img
            key={shop.className}
            src={shop.src}
            className={shop.className}
            custom={i + 1}
            variants={drop}
            initial="hidden"
            animate="visible"
            alt={shop.label}
          />
        ))}
      </div>
    </div>
  );
}

