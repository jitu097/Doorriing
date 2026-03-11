import React from 'react';
import './RestaurantLanding.css';

const RestaurantLanding = () => {
  return (
    <div className="restaurant-landing-page">
      {/* Plate drops in */}
      <img src="/plate.png" alt="Plate" className="plate-drop-img" />
      {/* Burger drops in */}
      <img src="/burger.png" alt="Burger" className="burger-drop-img" />
      {/* Pizza drops in */}
      <img src="/pizza.png" alt="Pizza" className="pizza-drop-img" />
      {/* Drink slides in */}
      <img src="/drink.png" alt="Drink" className="drink-slide-img" />
      {/* Steam or sparkle effect */}
      <img src="/steam.png" alt="Steam" className="steam-fade-img" />
    </div>
  );
};

export default RestaurantLanding;
