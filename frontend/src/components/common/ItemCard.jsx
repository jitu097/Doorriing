import React, { useState } from 'react';
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

  // Show as integer if no decimals, else show up to 2 decimals (removes .00)
  return numericPrice % 1 === 0 ? numericPrice.toString() : numericPrice.toFixed(2).replace(/\.00$/, '');
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
  const [showVariants, setShowVariants] = useState(false);
  
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
  const fallbackId = getFallbackId(id, name, priceValue ?? price);
  const serverItemId = id ?? fallbackId;
  const clientItemId = serverItemId;
  const cartItem = getCartItem(clientItemId);
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

    // If item has variants and they're not shown yet, show them instead of adding
    if (showVariantPricing && !showVariants) {
      setShowVariants(true);
      return;
    }

    // If no variants, add directly to cart
    addToCart({
      id: serverItemId,
      clientItemId,
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

    const variantSuffix = variant.key.toLowerCase();
    const variantClientId = `${clientItemId}-${variantSuffix}`;
    const variantServerId = `${serverItemId}-${variantSuffix}`;
    addToCart({
      id: variantServerId,
      clientItemId: variantClientId,
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
    });
  };

  const handleVariantUpdate = (variant, changeAmount) => {
    const variantSuffix = variant.key.toLowerCase();
    const variantId = `${clientItemId}-${variantSuffix}`;
    if (changeAmount > 0) {
      increaseQty(variantId);
    } else {
      decreaseQty(variantId);
      
      // Check if both Half and Full quantities are 0, if so collapse back to initial view
      const halfVariantId = `${clientItemId}-half`;
      const fullVariantId = `${clientItemId}-full`;
      const halfQty = getCartItem(halfVariantId)?.quantity || 0;
      const fullQty = getCartItem(fullVariantId)?.quantity || 0;
      
      // If both quantities are 0 after decrement, hide the portion controls
      if (halfQty === 0 && fullQty === 0) {
        setShowVariants(false);
      }
    }
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
        
        {showVariantPricing && showVariants && variantOptions ? (
          <div className="portion-controls-container">
            {variantOptions.map((variant) => {
              const variantId = `${clientItemId}-${variant.key.toLowerCase()}`;
              const variantCartItem = getCartItem(variantId);
              const variantQty = variantCartItem ? variantCartItem.quantity : 0;

              return (
                <div className="portion-row" key={variant.key}>
                  <div className="portion-info">
                    <span className="portion-label-small">{variant.label}</span>
                    <span className="portion-price-small">₹{variant.formattedPrice}</span>
                  </div>
                  {variantQty > 0 ? (
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleVariantUpdate(variant, -1)}
                        aria-label={`Decrease ${variant.label} quantity`}
                      >
                        −
                      </button>
                      <span>{variantQty}</span>
                      <button
                        onClick={() => handleVariantUpdate(variant, 1)}
                        aria-label={`Increase ${variant.label} quantity`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="portion-add-btn"
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleVariantAdd(variant)}
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="item-card-footer">
            <div className="item-card-price-block">
              {showVariantPricing && variantOptions ? (
                <div className="item-card-price-variants">
                  <span className="price-variant-text">Half: ₹{formattedHalfVariantPrice}</span>
                  <span className="price-variant-text">Full: ₹{formattedFullVariantPrice}</span>
                </div>
              ) : (
                <>
                  {shouldShowOriginal && (
                    <span className="item-card-price-original">₹{formattedOriginalPrice}</span>
                  )}
                  <span className="item-card-price">
                    {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
                  </span>
                </>
              )}
            </div>

            {!isInCart ? (
              <button
                className="item-card-add-btn"
                type="button"
                disabled={!isAvailable}
                onClick={handleAddToCart}
              >
                {!isAvailable ? 'UNAVAILABLE' : 'Add'}
              </button>
            ) : (
              <div className="item-card-qty-controls">
                <button
                  className="qty-btn-small"
                  onClick={() => decreaseQty(clientItemId)}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="qty-display-small">{cartItem.quantity}</span>
                <button
                  className="qty-btn-small"
                  onClick={() => increaseQty(clientItemId)}
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
