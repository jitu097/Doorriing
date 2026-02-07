import React from 'react';
import './itemcard.css';

const GroceryItemCard = ({ name, price, weight, image }) => {
  const handleAddToCart = () => {
    console.log(`Added ${name} to cart`);
  };

  return (
    <div className="grocery-item-card">
      <div className="grocery-item-card-content">
        <h3 className="grocery-item-name">{name}</h3>
        <div className="grocery-item-weight">{weight}</div>
        <div className="grocery-item-price">₹{price}</div>
        <button className="grocery-item-add-btn" onClick={handleAddToCart}>
          ADD TO CART
        </button>
      </div>
      {image && (
        <div className="grocery-item-card-image">
          <img src={image} alt={name} />
        </div>
      )}
    </div>
  );
};

export default GroceryItemCard;