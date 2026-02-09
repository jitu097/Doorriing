import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RestaurantLanding.css';

const RestaurantLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate to Restaurant.jsx after 3 seconds
    const timer = setTimeout(() => {
      navigate('/restaurant/browse');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="restaurant-landing-page">
      <img 
        src="/lollipop.png" 
        alt="Restaurant Landing" 
        className="restaurant-landing-image"
      />
    </div>
  );
};

export default RestaurantLanding;