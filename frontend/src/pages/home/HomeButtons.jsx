import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeButtons.css';

const HomeButtons = () => {
  const navigate = useNavigate();
  return (
    <div className="home-buttons-container">
      <button className="home-button grocery-button" onClick={() => navigate('/grocery')}>
        <img src="/store.webp" alt="Grocery Store" className="store-icon mobile-image" loading="lazy" />
        <img src="/Gbut.png" alt="Grocery Store" className="store-icon desktop-image" loading="lazy" />
      </button>
      <button className="home-button restaurant-button" onClick={() => navigate('/restaurant')}>
        <img src="/Rbuttonn.png" alt="Restaurant" className="restaurant-icon mobile-image" loading="lazy" />
        <img src="/Rbut.png" alt="Restaurant" className="restaurant-icon desktop-image" loading="lazy" />
      </button>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(HomeButtons);