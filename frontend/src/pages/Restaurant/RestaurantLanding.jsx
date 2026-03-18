import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from "lottie-react";
import foodAnimation from "../../assets/food.json";
import './RestaurantLanding.css';

const RestaurantLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-navigate to Restaurant.jsx after 3 seconds
    const timer = setTimeout(() => {
      navigate('/restaurant/browse');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="restaurant-landing-page">
      <Lottie 
        animationData={foodAnimation} 
        loop={true} 
        style={{ width: 300, height: 300 }} 
      />
    </div>
  );
};

export default RestaurantLanding;