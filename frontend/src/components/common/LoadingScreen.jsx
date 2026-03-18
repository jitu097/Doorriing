import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import shoppingAnimation from "../../assets/Shoppingbag.json";
const LoadingScreen = () => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out animation at 5.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
     
      <div className="animation-container">
        <Lottie 
          animationData={shoppingAnimation} 
          loop={true} 
          style={{ width: 400, height: 500, marginTop: 100 }} 
        />
      </div>

     
    </div>
  );
};

export default LoadingScreen;
