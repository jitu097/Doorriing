import React from 'react';
import './itemcard.css';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') {
    return null;
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return price;
  }

  return numericPrice.toFixed(2);
};

const GroceryItemCard = ({ name, price, subtitle, image }) => {
  const formattedPrice = formatPrice(price);

  return (
    <div className="grocery-item-card">
      <div className="grocery-item-card-content">
        <h3 className="grocery-item-name">{name}</h3>
        {subtitle && <div className="grocery-item-weight">{subtitle}</div>}
        <div className="grocery-item-price">
          {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
        </div>
        <button className="grocery-item-add-btn" type="button">
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