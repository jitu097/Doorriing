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
  stockQuantityLabel,
  stockQuantityValue,
  shopId,
  shopType,
  halfPortionPrice,
  fullPortionPrice,
}) => {
  const { addToCart, getCartItem, increaseQty, decreaseQty } = useCart();
  const basePrice = price;
  const hasHalfVariant = halfPortionPrice !== undefined && halfPortionPrice !== null;
  const fullVariantValue = fullPortionPrice ?? basePrice;
  const priceValue = hasHalfVariant ? fullVariantValue : (basePrice ?? fullVariantValue);
  const formattedPrice = formatPrice(priceValue);
  const formattedOriginalPrice = formatPrice(originalPrice);
  const priceNumeric = Number(priceValue);
  const originalNumeric = Number(originalPrice);
  const formattedHalfVariantPrice = hasHalfVariant ? formatPrice(halfPortionPrice) : null;
  const formattedFullVariantPrice = formatPrice(fullVariantValue);
  const showVariantPricing = Boolean(hasHalfVariant && formattedHalfVariantPrice);
  const variantOptions = showVariantPricing
    ? [
        {
          key: 'half',
          label: 'Half',
          formattedPrice: formattedHalfVariantPrice,
          priceValue: halfPortionPrice,
        },
        {
          key: 'full',
          label: 'Full',
          formattedPrice: formattedFullVariantPrice,
          priceValue: fullVariantValue,
        },
      ]
    : null;
  const itemId = getFallbackId(id, name, priceValue ?? price);
  const cartItem = getCartItem(itemId);
  const isInCart = Boolean(cartItem);
  const secondaryText = subtitle || description;
  const showVegIndicator = typeof isVeg === 'boolean';
  const hasStockLabel = typeof stockQuantityLabel === 'string' && stockQuantityLabel.trim().length > 0;
  const stockDisplayLabel = hasStockLabel ? stockQuantityLabel.trim() : null;
  const stockLabelClass = hasStockLabel && typeof stockQuantityValue === 'number' && stockQuantityValue <= 5
    ? 'item-card-quantity low'
    : 'item-card-quantity';

  const handleAddToCart = () => {
    if (!isAvailable) {
      return;
    }

    addToCart({
      id: itemId,
      name,
      price: priceValue ?? price,
      image,
      subtitle: secondaryText,
      originalPrice,
      isVeg,
      description,
      shopId,
      shopType,
    });
  };

  const handleVariantAdd = (variant) => {
    if (!isAvailable) {
      return;
    }

    const variantId = `${itemId}-${variant.key}`;
    addToCart({
      id: variantId,
      name: `${name} (${variant.label})`,
      price: variant.priceValue,
      image,
      subtitle: secondaryText,
      originalPrice: undefined,
      isVeg,
      description,
      shopId,
      shopType,
      portion: variant.label,
      baseItemId: itemId,
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
        {hasStockLabel && <p className={stockLabelClass}>{stockDisplayLabel}</p>}
        {showVariantPricing && variantOptions ? (
          <div className="item-card-variants">
            {variantOptions.map((variant) => {
              const variantId = `${itemId}-${variant.key}`;
              const variantCartItem = getCartItem(variantId);
              const inVariantCart = Boolean(variantCartItem);

              return (
                <div className="item-card-variant-row" key={variant.key}>
                  <div className="item-card-variant-info">
                    <span className="item-card-variant-label">{variant.label}</span>
                    <span className="item-card-variant-price">₹{variant.formattedPrice}</span>
                  </div>
                  {!inVariantCart ? (
                    <button
                      className="item-card-add-btn"
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleVariantAdd(variant)}
                    >
                      {isAvailable ? 'ADD' : 'UNAVAILABLE'}
                    </button>
                  ) : (
                    <div className="item-card-qty-controls">
                      <button
                        className="qty-btn-small"
                        onClick={() => decreaseQty(variantId)}
                        aria-label={`Decrease ${variant.label} quantity`}
                      >
                        -
                      </button>
                      <span className="qty-display-small">{variantCartItem.quantity}</span>
                      <button
                        className="qty-btn-small"
                        onClick={() => increaseQty(variantId)}
                        aria-label={`Increase ${variant.label} quantity`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default ItemCard;
