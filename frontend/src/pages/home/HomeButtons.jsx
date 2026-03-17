import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeButtons.css';

const HomeButtons = () => {
  const navigate = useNavigate();
  return (
    <div className="home-buttons-container">
      <button className="home-button grocery-button" onClick={() => navigate('/grocery')}>
        <img src="/store.png" alt="Grocery Store" className="store-icon" />
        <span className="button-text">Grocery</span>
      </button>
      <button className="home-button restaurant-button" onClick={() => navigate('/restaurant')}>
        <img src="/catering.png" alt="Restaurant Catering" className="restaurant-icon" />
        <span className="button-text">Restaurants</span>
      </button>
    </div>
  );
};

export default HomeButtons;