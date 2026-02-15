import React from 'react';
import { useNavigate } from 'react-router-dom';
import './shopcard.css';

const ShopCard = ({ id, image, title, description, city }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/grocery/shop/${id}`);
  };

  const initials = title ? title.charAt(0).toUpperCase() : '?';

  return (
    <div className="shop-card" onClick={handleClick}>
      <div className="shop-card-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="shop-card-placeholder">{initials}</div>
        )}
      </div>
      <div className="shop-card-content">
        <h3 className="shop-card-title">{title}</h3>
        {description && <p className="shop-card-description">{description}</p>}
        {city && <p className="shop-card-description">{city}</p>}
      </div>
    </div>
  );
};

export default ShopCard;
