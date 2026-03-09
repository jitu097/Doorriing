import React, { useState, useEffect } from 'react';
import './LoadingScreenWithSkip.css';

const LoadingScreenWithSkip = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete && onComplete();
    }, 500);
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* Skip Button */}
      <button className="skip-button" onClick={handleSkip}>
        Skip →
      </button>

      {/* Decorative Bubbles */}
      <div className="bubble bubble-1"></div>
      <div className="bubble bubble-2"></div>
      <div className="bubble bubble-3"></div>
      <div className="bubble bubble-4"></div>
      <div className="bubble bubble-5"></div>
      <div className="bubble bubble-6"></div>

      <div className="animation-container">
        {/* House and Door */}
        <div className="house">
          <div className="door-frame">
            <img src="/Door.png" alt="Door" className="door-image" />
            <div className="doorbell">🔔</div>
            <div className="doorbell-ring"></div>
          </div>
          
          {/* Customer appears from behind the door */}
          <div className="customer">
            <img src="/Dooll.png" alt="Customer" className="customer-img" />
          </div>
        </div>

        {/* Delivery Boy */}
        <div className="delivery-boy">
          <img src="/Booy.png" alt="Delivery Boy" className="delivery-boy-img" />
          <img src="/Carrybag.png" alt="Shopping Bag" className="delivery-bag" />
        </div>

        {/* Handover Bag Animation */}
        <img src="/Carrybag.png" alt="Shopping Bag" className="bag-transfer" />
      </div>

      {/* Brand Name */}
      <div className="brand-container">
        <img src="/Doorriing.png" alt="DoorRing" className="brand-logo" />
        <p className="brand-tagline">Ring once, your needs arrive</p>
      </div>

      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default LoadingScreenWithSkip;
