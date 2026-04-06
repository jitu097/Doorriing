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

const hasDiscount = (original, final) => {
  if (original === undefined || original === null || final === undefined || final === null) {
    return false;
  }

  const originalNumber = Number(original);
  const finalNumber = Number(final);

  if (!Number.isNaN(originalNumber) && !Number.isNaN(finalNumber)) {
    return finalNumber < originalNumber;
  }

  return String(original) !== String(final);
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
  halfPortionFinalPrice,
  fullPortionFinalPrice,
  foodType,
}) => {
  const { addToCart, getCartItem, increaseQty, decreaseQty } = useCart();
  const [showVariants, setShowVariants] = useState(false);
  const isRestaurantCard = shopType === 'restaurant';
  
  const normalizedFoodType = isRestaurantCard
    ? (foodType || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
    : null;
  const derivedIsVeg = normalizedFoodType
    ? normalizedFoodType !== 'nonveg'
    : (typeof isVeg === 'boolean' ? isVeg : true);
  const foodIndicatorSymbol = isRestaurantCard ? (derivedIsVeg ? '🟢' : '🔴') : null;

  const baseOriginalPrice = originalPrice ?? fullPortionPrice ?? price;
  const baseFinalPrice = price ?? fullPortionFinalPrice ?? fullPortionPrice ?? baseOriginalPrice;
  const halfOriginalPriceValue = halfPortionPrice ?? null;
  const halfFinalPriceValue = halfPortionFinalPrice ?? halfPortionPrice ?? null;
  const fullOriginalPriceValue = fullPortionPrice ?? baseOriginalPrice;
  const fullFinalPriceValue = fullPortionFinalPrice ?? fullPortionPrice ?? baseFinalPrice;

  const hasHalfVariant = halfFinalPriceValue !== null && halfFinalPriceValue !== undefined;
  const priceValue = hasHalfVariant ? fullFinalPriceValue : baseFinalPrice;
  const formattedPrice = formatPrice(priceValue);
  const formattedOriginalPrice = formatPrice(hasHalfVariant ? fullOriginalPriceValue : baseOriginalPrice);
  const formattedHalfVariantPrice = hasHalfVariant ? formatPrice(halfFinalPriceValue) : null;
  const formattedHalfVariantOriginalPrice = hasHalfVariant ? formatPrice(halfOriginalPriceValue) : null;
  const formattedFullVariantPrice = formatPrice(fullFinalPriceValue);
  const formattedFullVariantOriginalPrice = formatPrice(fullOriginalPriceValue);
  const showVariantPricing = Boolean(hasHalfVariant && formattedHalfVariantPrice);
  const variantOptions = showVariantPricing
    ? [
        {
          key: 'full',
          label: 'Full',
          formattedPrice: formattedFullVariantPrice,
          formattedOriginalPrice: formattedFullVariantOriginalPrice,
          priceValue: fullFinalPriceValue,
          originalValue: fullOriginalPriceValue,
          hasDiscount: hasDiscount(fullOriginalPriceValue, fullFinalPriceValue),
        },
        {
          key: 'half',
          label: 'Half',
          formattedPrice: formattedHalfVariantPrice,
          formattedOriginalPrice: formattedHalfVariantOriginalPrice,
          priceValue: halfFinalPriceValue,
          originalValue: halfOriginalPriceValue,
          hasDiscount: hasDiscount(halfOriginalPriceValue, halfFinalPriceValue),
        },
      ]
    : null;
  const fallbackId = getFallbackId(id, name, priceValue ?? price);
  const serverItemId = id ?? fallbackId;
  const clientItemId = serverItemId;
  const cartItem = getCartItem(clientItemId);
  const isInCart = Boolean(cartItem);
  const secondaryText = subtitle || description;
  const showFoodIndicator = Boolean(foodIndicatorSymbol);
  const legacyVegIndicator = !isRestaurantCard && typeof isVeg === 'boolean';
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
      isVeg: derivedIsVeg,
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
      isVeg: derivedIsVeg,
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

  const shouldShowOriginal = hasDiscount(
    hasHalfVariant ? fullOriginalPriceValue : baseOriginalPrice,
    priceValue
  );

  const renderDefaultPortionControls = () => (
    <div className="portion-controls-container">
      {variantOptions?.map((variant) => {
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
  );

  const renderDefaultFooter = () => (
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
  );

  const renderRestaurantVariantPanel = () => {
    if (!variantOptions) {
      return null;
    }

    return (
      <div className="restaurant-variant-panel">
        {variantOptions.map((variant) => {
          const variantId = `${clientItemId}-${variant.key.toLowerCase()}`;
          const variantCartItem = getCartItem(variantId);
          const variantQty = variantCartItem ? variantCartItem.quantity : 0;

          return (
            <div className="restaurant-variant-row" key={variant.key}>
              <div className="restaurant-variant-info">
                <span className="restaurant-variant-label">{variant.label}</span>
                <div className="restaurant-variant-price-stack">
                  {variant.hasDiscount && variant.formattedOriginalPrice && (
                    <span className="restaurant-variant-original">₹{variant.formattedOriginalPrice}</span>
                  )}
                  <span className="restaurant-variant-final">₹{variant.formattedPrice}</span>
                </div>
              </div>
              {variantQty > 0 ? (
                <div className="restaurant-qty-controls">
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
                  className="restaurant-variant-add"
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
    );
  };

  const renderRestaurantFooter = () => {
    if (showVariantPricing && showVariants) {
      return renderRestaurantVariantPanel();
    }

    const hasVariantChips = Boolean(variantOptions && variantOptions.length);
    const fullVariantData = variantOptions?.find((variant) => variant.key === 'full');
    const halfVariantData = variantOptions?.find((variant) => variant.key === 'half');

    return (
      <div className="restaurant-footer-collapsed">
        {hasVariantChips ? (
          <div className="restaurant-price-chip-row">
            <span className="restaurant-price-chip full">
              <span className="restaurant-chip-label">Full</span>
              <div className="restaurant-chip-price-stack">
                {fullVariantData?.hasDiscount && fullVariantData?.formattedOriginalPrice && (
                  <span className="restaurant-chip-original">₹{fullVariantData.formattedOriginalPrice}</span>
                )}
                <span className="restaurant-chip-final">
                  ₹{fullVariantData?.formattedPrice || formattedFullVariantPrice}
                </span>
              </div>
            </span>
            <span className="restaurant-price-chip half">
              <span className="restaurant-chip-label">Half</span>
              <div className="restaurant-chip-price-stack">
                {halfVariantData?.hasDiscount && halfVariantData?.formattedOriginalPrice && (
                  <span className="restaurant-chip-original">₹{halfVariantData.formattedOriginalPrice}</span>
                )}
                <span className="restaurant-chip-final">
                  ₹{halfVariantData?.formattedPrice || formattedHalfVariantPrice}
                </span>
              </div>
            </span>
          </div>
        ) : (
          <div className="restaurant-price-stack">
            <span className="restaurant-price-label">Full</span>
            {shouldShowOriginal && (
              <span className="restaurant-price-original">₹{formattedOriginalPrice}</span>
            )}
            <span className="restaurant-price-current">
              {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
            </span>
          </div>
        )}

        {hasVariantChips ? (
          <button
            className="restaurant-add-main"
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCart}
          >
            {!isAvailable ? 'UNAVAILABLE' : 'Add'}
          </button>
        ) : !isInCart ? (
          <button
            className="restaurant-add-main"
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCart}
          >
            {!isAvailable ? 'UNAVAILABLE' : 'Add'}
          </button>
        ) : (
          <div className="restaurant-qty-controls restaurant-main-qty">
            <button onClick={() => decreaseQty(clientItemId)} aria-label="Decrease quantity">
              −
            </button>
            <span>{cartItem.quantity}</span>
            <button onClick={() => increaseQty(clientItemId)} aria-label="Increase quantity">
              +
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => {
    if (isRestaurantCard) {
      return renderRestaurantFooter();
    }

    if (showVariantPricing && showVariants && variantOptions) {
      return renderDefaultPortionControls();
    }

    return renderDefaultFooter();
  };

  return (
    <div className={`item-card${!isAvailable ? ' item-card-disabled' : ''}${isRestaurantCard ? ' restaurant-card' : ''}`}>
      {image && (
        <div className="item-card-image">
          <img src={image} alt={name} loading="lazy" />
        </div>
      )}

      <div className="item-card-body">
        <div className="item-card-title-row">
          {showFoodIndicator ? (
            <span
              className="food-type-indicator"
              aria-label={derivedIsVeg ? 'Vegetarian item' : 'Non-vegetarian item'}
              title={derivedIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <img
                src={derivedIsVeg ? '/vegy.webp' : '/nonveg.webp'}
                alt={derivedIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                style={{ width: 18, height: 18, verticalAlign: 'middle' }}
              />
            </span>
          ) : legacyVegIndicator ? (
            <span className={`item-card-veg-badge ${isVeg ? 'veg' : 'non-veg'}`}>
              <span className="veg-dot" />
            </span>
          ) : null}
          <h3 className="item-card-name">{name}</h3>
        </div>

        {secondaryText && <p className="item-card-subtitle">{secondaryText}</p>}
        {hasStockLabel && <p className={stockLabelClass}>{stockDisplayLabel}</p>}
        
        {renderFooter()}
      </div>
    </div>
  );
};

export default React.memo(ItemCard);
