import React from 'react';
import { useCart } from '../../context/CartContext';
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

const ItemCard = ({ id, name, price, isVeg, image, isAvailable = true, description }) => {
  const { addToCart, getCartItem, increaseQty, decreaseQty } = useCart();
  const formattedPrice = formatPrice(price);
  const showVegIndicator = typeof isVeg === 'boolean';

  // Generate unique ID from name and price if no ID provided
  const itemId = id || `${name}-${price}`.toLowerCase().replace(/\s+/g, '-');

  // Check if item is in cart
  const cartItem = getCartItem(itemId);
  const isInCart = !!cartItem;

  const handleAddToCart = () => {
    if (!isAvailable) return;

    addToCart({
      id: itemId,
      name,
      price,
      image,
      isVeg,
      description
    });
  };

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

        {!isInCart ? (
          <button
            className="item-add-btn"
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCart}
          >
            {isAvailable ? 'ADD TO CART' : 'UNAVAILABLE'}
          </button>
        ) : (
          <div className="item-qty-controls">
            <button
              className="qty-btn-small"
              onClick={() => decreaseQty(itemId)}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="qty-display-small">{cartItem.quantity}</span>
            <button
              className="qty-btn-small"
              onClick={() => increaseQty(itemId)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
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