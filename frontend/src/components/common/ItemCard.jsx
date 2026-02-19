import React from 'react';
import { useCart } from '../../context/CartContext';
import './ItemCard.css';

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

const getFallbackId = (id, name, price) => {
  if (id) {
    return id;
  }

  const safeName = (name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safePrice = price !== undefined && price !== null ? String(price) : 'na';
  return `${safeName}-${safePrice}`;
};

const ItemCard = ({
  id,
  name,
  price,
  originalPrice,
  subtitle,
  description,
  image,
  isVeg,
  isAvailable = true,
}) => {
  const { addToCart, getCartItem, increaseQty, decreaseQty } = useCart();
  const formattedPrice = formatPrice(price);
  const formattedOriginalPrice = formatPrice(originalPrice);
  const priceNumeric = Number(price);
  const originalNumeric = Number(originalPrice);
  const itemId = getFallbackId(id, name, price);
  const cartItem = getCartItem(itemId);
  const isInCart = Boolean(cartItem);
  const secondaryText = subtitle || description;
  const showVegIndicator = typeof isVeg === 'boolean';

  const handleAddToCart = () => {
    if (!isAvailable) {
      return;
    }

    addToCart({
      id: itemId,
      name,
      price,
      image,
      subtitle: secondaryText,
      originalPrice,
      isVeg,
      description,
    });
  };

  const shouldShowOriginal =
    formattedOriginalPrice &&
    formattedPrice &&
    !Number.isNaN(originalNumeric) &&
    !Number.isNaN(priceNumeric) &&
    originalNumeric > priceNumeric;

  return (
    <div className={`item-card${!isAvailable ? ' item-card-disabled' : ''}`}>
      {image && (
        <div className="item-card-image">
          <img src={image} alt={name} />
        </div>
      )}

      <div className="item-card-body">
        <div className="item-card-title-row">
          {showVegIndicator && (
            <span className={`item-card-veg-badge ${isVeg ? 'veg' : 'non-veg'}`}>
              <span className="veg-dot" />
            </span>
          )}
          <h3 className="item-card-name">{name}</h3>
        </div>

        {secondaryText && <p className="item-card-subtitle">{secondaryText}</p>}

        <div className="item-card-footer">
          <div className="item-card-price-block">
            {shouldShowOriginal && (
              <span className="item-card-price-original">₹{formattedOriginalPrice}</span>
            )}
            <span className="item-card-price">
              {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
            </span>
          </div>

          {!isInCart ? (
            <button
              className="item-card-add-btn"
              type="button"
              disabled={!isAvailable}
              onClick={handleAddToCart}
            >
              {isAvailable ? 'ADD' : 'UNAVAILABLE'}
            </button>
          ) : (
            <div className="item-card-qty-controls">
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
      </div>
    </div>
  );
};

export default ItemCard;
