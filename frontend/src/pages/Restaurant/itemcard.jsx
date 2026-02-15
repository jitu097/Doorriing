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

const ItemCard = ({ name, price, isVeg, image, isAvailable = true, description }) => {
  const formattedPrice = formatPrice(price);
  const showVegIndicator = typeof isVeg === 'boolean';

  return (
    <div className="item-card">
      <div className="item-card-content">
        {showVegIndicator && (
          <div className="item-veg-indicator">
            <div className={`veg-badge ${isVeg ? 'veg' : 'non-veg'}`}>
              <div className="veg-dot" />
            </div>
          </div>
        )}
        <h3 className="item-name">{name}</h3>
        {description && <p className="item-description">{description}</p>}
        <div className="item-price">
          {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
        </div>
        <button className="item-add-btn" type="button" disabled={!isAvailable}>
          {isAvailable ? 'ADD TO CART' : 'UNAVAILABLE'}
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