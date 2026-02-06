import React from 'react';
import { useNavigate } from 'react-router-dom';
import './card.css';

const RestaurantCard = ({ id, image, title, description }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/restaurant/shop/${id}`);
  };

  return (
    <div className="restaurant-card" onClick={handleClick}>
      <div className="restaurant-card-image">
        <img src={image} alt={title} />
      </div>
      <div className="restaurant-card-content">
        <h3 className="restaurant-card-title">{title}</h3>
        <p className="restaurant-card-description">{description}</p>
      </div>
    </div>
  );
};

export default RestaurantCard;