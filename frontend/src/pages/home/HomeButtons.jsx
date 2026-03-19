import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeButtons.css';

const HomeButtons = () => {
  const navigate = useNavigate();
  return (
    <div className="home-buttons-container">
      <button className="home-button grocery-button" onClick={() => navigate('/grocery')}>
        <img src="/store.webp" alt="Grocery Store" className="store-icon" loading="lazy" />
      </button>
      <button className="home-button restaurant-button" onClick={() => navigate('/restaurant')}>
        <img src="/Rbuttonn.webp" alt="Restaurant" className="restaurant-icon" loading="lazy" />
      </button>
    </div>
  );
};

export default HomeButtons;