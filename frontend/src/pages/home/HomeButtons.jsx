import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeButtons.css';

const HomeButtons = () => {
  const navigate = useNavigate();
  return (
    <div className="home-buttons-container">
      <button className="home-button" onClick={() => navigate('/grocery')}>
        <img src="/Grocery.png" alt="Grocery" />
       
      </button>
      <button className="home-button" onClick={() => navigate('/restaurant')}>
        <img src="/Restro.png" alt="Restaurant" />
       
      </button>
    </div>
  );
};

export default HomeButtons;
