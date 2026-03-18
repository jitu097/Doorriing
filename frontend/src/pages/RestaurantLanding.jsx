import React from 'react';
import Lottie from "lottie-react";
import foodAnimation from "../assets/food.json";
import './RestaurantLanding.css';

const RestaurantLanding = () => {
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
