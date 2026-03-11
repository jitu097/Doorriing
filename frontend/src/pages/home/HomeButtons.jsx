import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeButtons.css';

const HomeButtons = () => {
  const navigate = useNavigate();
  return (
    <div className="home-buttons-container">
      <button className="home-button grocery-button" onClick={() => navigate('/grocery')}>
        <span className="button-text">Grocery</span>
      </button>
      <button className="home-button restaurant-button" onClick={() => navigate('/restaurant')}>
        <span className="button-text">Restaurant</span>
      </button>
    </div>
  );
};

export default HomeButtons;
