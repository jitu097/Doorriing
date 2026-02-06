import React from 'react';
import './itemcard.css';

const ItemCard = ({ name, price, isVeg, image, isAvailable = true }) => {
  const handleAddToCart = () => {
    // Add to cart logic here
    console.log(`Added ${name} to cart`);
  };

  return (
    <div className="item-card">
      <div className="item-card-content">
        <div className="item-veg-indicator">
          <div className={`veg-badge ${isVeg ? 'veg' : 'non-veg'}`}>
            <div className="veg-dot"></div>
          </div>
        </div>
        <h3 className="item-name">{name}</h3>
        <div className="item-price">₹{price}/regular</div>
        <button className="item-add-btn" onClick={handleAddToCart}>
          ADD TO CART
        </button>
      </div>
      {image && (
        <div className="item-card-image">
          <img src={image} alt={name} />
        </div>
      )}
    </div>
  );
};

export default ItemCard;