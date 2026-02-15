import React from 'react';
import { useNavigate } from 'react-router-dom';
import './card.css';

const RestaurantCard = ({ id, image, title, description, city }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/restaurant/shop/${id}`);
  };

  const initials = title ? title.charAt(0).toUpperCase() : '?';

  return (
    <div className="restaurant-card" onClick={handleClick}>
      <div className="restaurant-card-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="restaurant-card-placeholder">{initials}</div>
        )}
      </div>
      <div className="restaurant-card-content">
        <h3 className="restaurant-card-title">{title}</h3>
        {description && <p className="restaurant-card-description">{description}</p>}
        {city && <p className="restaurant-card-description">{city}</p>}
      </div>
    </div>
  );
};

export default RestaurantCard;