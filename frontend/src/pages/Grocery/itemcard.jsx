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

const GroceryItemCard = ({ id, name, price, subtitle, image }) => {
  const { addToCart, getCartItem, increaseQty, decreaseQty } = useCart();
  const formattedPrice = formatPrice(price);

  // Generate unique ID from name and price if no ID provided
  const itemId = id || `${name}-${price}`.toLowerCase().replace(/\s+/g, '-');

  // Check if item is in cart
  const cartItem = getCartItem(itemId);
  const isInCart = !!cartItem;

  const handleAddToCart = () => {
    addToCart({
      id: itemId,
      name,
      price,
      image,
      subtitle
    });
  };

  return (
    <div className="grocery-item-card">
      <div className="grocery-item-card-content">
        <h3 className="grocery-item-name">{name}</h3>
        {subtitle && <div className="grocery-item-weight">{subtitle}</div>}
        <div className="grocery-item-price">
          {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
        </div>

        {!isInCart ? (
          <button
            className="grocery-item-add-btn"
            type="button"
            onClick={handleAddToCart}
          >
            ADD TO CART
          </button>
        ) : (
          <div className="grocery-item-qty-controls">
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
        <div className="grocery-item-card-image">
          <img src={image} alt={name} />
        </div>
      )}
    </div>
  );
};

export default GroceryItemCard;