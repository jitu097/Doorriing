import React from 'react';
import { useNavigate } from 'react-router-dom';
import './shopcard.css';

const ShopCard = ({ id, image, title, description }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/grocery/shop/${id}`);
  };

  return (
    <div className="shop-card" onClick={handleClick}>
      <div className="shop-card-image">
        <img src={image} alt={title} />
      </div>
      <div className="shop-card-content">
        <h3 className="shop-card-title">{title}</h3>
        <p className="shop-card-description">{description}</p>
      </div>
    </div>
  );
};

export default ShopCard;
