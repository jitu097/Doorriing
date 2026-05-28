import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCartActions, useItemCartInfo } from '../../context/CartContext';
import { useAppAvailability } from '../../context/AppAvailabilityContext';
import './ItemCard.css';

const STARS_ARRAY = [0, 1, 2, 3, 4];

const optimizeCloudinaryUrl = (url, width = 400) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('upload/c_') || url.includes('upload/f_') || url.includes('upload/q_')) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${width},f_webp,q_auto/`);
};

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') {
    return null;
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return price;
  }

  return numericPrice % 1 === 0 ? numericPrice.toString() : numericPrice.toFixed(2).replace(/\.00$/, '');
};

const resolvePrice = (computed, original) => {
  const c = Number(computed);
  const o = Number(original);
  if (!Number.isNaN(c) && c > 0) return c;
  if (!Number.isNaN(o) && o > 0) return o;
  if (!Number.isNaN(c) && computed != null) return c;
  return null;
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
  is_sweets,
  halfPortionPrice,
  fullPortionPrice,
  halfPortionFinalPrice,
  fullPortionFinalPrice,
  foodType,
  baseQuantity,
  unit,
  averageRating,
  reviewCount,
}) => {
  const { addToCart, increaseQty, decreaseQty } = useCartActions();
  const { isOpen: appIsOpen, isLoading: appAvailabilityLoading } = useAppAvailability();
  const [showVariants, setShowVariants] = useState(false);
  const [availabilityToast, setAvailabilityToast] = useState(null);
  const [descPosition, setDescPosition] = useState(null); // null or { open: true }
  const cardRef = useRef(null);
  const isRestaurantCard = shopType === 'restaurant';

  const appClosed = !appAvailabilityLoading && !appIsOpen;
  const orderingDisabled = !isAvailable || appClosed;

  // ── Memoized calculations for pricing, food types, and IDs ───────────────
  const memoizedDetails = useMemo(() => {
    const normalizedFoodType = isRestaurantCard
      ? (foodType || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '')
      : null;
    const derivedIsVeg = normalizedFoodType
      ? normalizedFoodType !== 'nonveg'
      : (typeof isVeg === 'boolean' ? isVeg : true);
    const foodIndicatorSymbol = isRestaurantCard ? (derivedIsVeg ? '🟢' : '🔴') : null;

    const baseOriginalPrice = originalPrice ?? fullPortionPrice ?? price;
    const rawFinalPrice = price ?? fullPortionFinalPrice ?? fullPortionPrice ?? baseOriginalPrice;
    const baseFinalPrice = resolvePrice(rawFinalPrice, baseOriginalPrice);

    const halfOriginalPriceValue = halfPortionPrice ?? null;
    const halfFinalPriceValue = halfPortionFinalPrice != null
      ? resolvePrice(halfPortionFinalPrice, halfPortionPrice)
      : (halfPortionPrice != null ? Number(halfPortionPrice) : null);

    const fullOriginalPriceValue = fullPortionPrice ?? baseOriginalPrice;
    const rawFullFinal = fullPortionFinalPrice ?? fullPortionPrice ?? baseFinalPrice;
    const fullFinalPriceValue = resolvePrice(rawFullFinal, fullOriginalPriceValue);

    const hasHalfVariant = halfFinalPriceValue !== null && halfFinalPriceValue !== undefined;
    const priceValue = hasHalfVariant ? fullFinalPriceValue : baseFinalPrice;
    const formattedPrice = formatPrice(priceValue);
    const formattedOriginalPrice = formatPrice(hasHalfVariant ? fullOriginalPriceValue : baseOriginalPrice);
    const formattedHalfVariantPrice = hasHalfVariant ? formatPrice(halfFinalPriceValue) : null;
    const formattedHalfVariantOriginalPrice = hasHalfVariant ? formatPrice(halfOriginalPriceValue) : null;
    const formattedFullVariantPrice = formatPrice(fullFinalPriceValue);
    const formattedFullVariantOriginalPrice = formatPrice(fullOriginalPriceValue);
    const showVariantPricing = Boolean(hasHalfVariant && formattedHalfVariantPrice);
    const sweetVariantLabels = Boolean(is_sweets);

    const variantOptions = showVariantPricing
      ? [
        {
          key: 'full',
          label: sweetVariantLabels ? 'Per Kg' : 'Full',
          formattedPrice: formattedFullVariantPrice,
          formattedOriginalPrice: formattedFullVariantOriginalPrice,
          priceValue: fullFinalPriceValue,
          originalValue: fullOriginalPriceValue,
          hasDiscount: hasDiscount(fullOriginalPriceValue, fullFinalPriceValue),
        },
        {
          key: 'half',
          label: sweetVariantLabels ? 'Per Piece' : 'Half',
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

    const secondaryText = subtitle || description;
    const showFoodIndicator = Boolean(foodIndicatorSymbol);
    const legacyVegIndicator = isRestaurantCard && typeof isVeg === 'boolean';

    return {
      derivedIsVeg,
      foodIndicatorSymbol,
      hasHalfVariant,
      priceValue,
      formattedPrice,
      formattedOriginalPrice,
      formattedHalfVariantPrice,
      showVariantPricing,
      variantOptions,
      serverItemId,
      clientItemId,
      secondaryText,
      showFoodIndicator,
      legacyVegIndicator,
    };
  }, [
    isRestaurantCard,
    foodType,
    isVeg,
    originalPrice,
    fullPortionPrice,
    price,
    halfPortionPrice,
    halfPortionFinalPrice,
    fullPortionFinalPrice,
    is_sweets,
    id,
    name,
    subtitle,
    description,
  ]);

  const {
    derivedIsVeg,
    foodIndicatorSymbol,
    hasHalfVariant,
    priceValue,
    formattedPrice,
    formattedOriginalPrice,
    formattedHalfVariantPrice,
    showVariantPricing,
    variantOptions,
    serverItemId,
    clientItemId,
    secondaryText,
    showFoodIndicator,
    legacyVegIndicator,
  } = memoizedDetails;

  const measureText = useMemo(() => {
    const quantityText = baseQuantity !== undefined && baseQuantity !== null && String(baseQuantity).trim() !== ''
      ? String(baseQuantity).trim()
      : '';
    const unitText = unit !== undefined && unit !== null && String(unit).trim() !== ''
      ? String(unit).trim()
      : '';

    const combined = [quantityText, unitText].filter(Boolean).join(' ');
    return combined || null;
  }, [baseQuantity, unit]);

  // ── Memoized Rating and Stock metadata ───────────────────────────────────
  const ratingAndStockMeta = useMemo(() => {
    const hasStockLabel = typeof stockQuantityLabel === 'string' && stockQuantityLabel.trim().length > 0;
    const stockDisplayLabel = hasStockLabel ? stockQuantityLabel.trim() : null;
    const stockLabelClass = hasStockLabel && typeof stockQuantityValue === 'number' && stockQuantityValue <= 5
      ? 'item-card-quantity low'
      : 'item-card-quantity';
    const numericAverageRating = Number(averageRating);
    const numericReviewCount = Number(reviewCount);
    const hasRating = Number.isFinite(numericAverageRating) && numericAverageRating > 0 && Number.isFinite(numericReviewCount) && numericReviewCount > 0;
    const roundedRatingStars = hasRating ? Math.round(numericAverageRating) : 0;

    return {
      hasStockLabel,
      stockDisplayLabel,
      stockLabelClass,
      numericAverageRating,
      numericReviewCount,
      hasRating,
      roundedRatingStars,
    };
  }, [stockQuantityLabel, stockQuantityValue, averageRating, reviewCount]);

  const {
    hasStockLabel,
    stockDisplayLabel,
    stockLabelClass,
    numericAverageRating,
    numericReviewCount,
    hasRating,
    roundedRatingStars,
  } = ratingAndStockMeta;

  useEffect(() => {
    console.log('=== ITEMCARD RENDER ===', {
      itemId: id,
      clientItemId,
      variantState: showVariants,
      timestamp: performance.now(),
    });
  });

  useEffect(() => {
    return () => {
      console.log('ITEMCARD UNMOUNTED', id);
    };
  }, [id]);
  // ── isolated Cart Subscriptions ─────────────────────────────────────────
  const { cartItem, halfCartItem, fullCartItem } = useItemCartInfo(clientItemId, hasHalfVariant);
  
  // For variant items (half/full), isInCart must be true when ANY variant is in the cart.
  const isInCart = hasHalfVariant
    ? Boolean(halfCartItem || fullCartItem)
    : Boolean(cartItem);

  const optimizedImage = useMemo(() => optimizeCloudinaryUrl(image, 400), [image]);

  // Keep variant panel expanded when items exist in cart, and collapse when both go to 0.
  // Also auto-expand on mount if cart was restored with variant items.
  useEffect(() => {
    if (!hasHalfVariant) return;
    const halfQty = halfCartItem?.quantity || 0;
    const fullQty = fullCartItem?.quantity || 0;
    const anyInCart = halfQty > 0 || fullQty > 0;

    if (anyInCart && !showVariants) {
      setShowVariants(true);
    }
  }, [hasHalfVariant, halfCartItem, fullCartItem, showVariants]);

  // ── Safe Toast timer handling ──────────────────────────────────────────
  const toastTimeoutRef = useRef(null);

  const showUnavailableToast = useCallback((message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setAvailabilityToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setAvailabilityToast(null);
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ── Event Handlers ───────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async () => {
    if (orderingDisabled) {
      if (appClosed) {
        showUnavailableToast('Currently unavailable for orders. Please try again later.');
      }
      return;
    }

    if (showVariantPricing && !showVariants) {
      setShowVariants(true);
      return;
    }

    console.log('=== NORMAL ADD CLICK START ===', {
      clientItemId,
      item: {
        id,
        name,
        price: priceValue ?? price,
      },
    });

    try {
      await addToCart({
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
        baseQuantity,
        unit,
      });
    } catch (err) {
      if (err.code === 'APP_UNAVAILABLE') {
        showUnavailableToast(err.message);
      } else {
        showUnavailableToast(err.message || 'Failed to add item. Please try again.');
      }
    }
  }, [
    orderingDisabled,
    appClosed,
    showVariantPricing,
    showVariants,
    addToCart,
    serverItemId,
    clientItemId,
    name,
    priceValue,
    price,
    image,
    secondaryText,
    originalPrice,
    derivedIsVeg,
    description,
    shopId,
    shopType,
    baseQuantity,
    unit,
    showUnavailableToast,
  ]);

  const handleVariantAdd = useCallback(async (variant) => {
    console.debug('[ItemCard] handleVariantAdd called', { variantKey: variant?.key, orderingDisabled });
      console.log('=== HANDLE VARIANT ADD ===', {
        receivedVariant: variant,
        item: {
          id,
          clientItemId,
          name,
          price: priceValue ?? price,
        },
        timestamp: performance.now(),
      });

    if (orderingDisabled) {
      if (appClosed) {
        showUnavailableToast('Currently unavailable for orders. Please try again later.');
      }
      return;
    }

    const variantSuffix = variant.key.toLowerCase();
    const variantClientId = `${clientItemId}-${variantSuffix}`;
    try {
      await addToCart({
        id: serverItemId,
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
        portion: variant.key,
        baseQuantity,
        unit,
      });
    } catch (err) {
      if (err.code === 'APP_UNAVAILABLE') {
        showUnavailableToast(err.message);
      } else {
        showUnavailableToast(err.message || 'Failed to add item. Please try again.');
      }
    }
  }, [
    orderingDisabled,
    appClosed,
    clientItemId,
    serverItemId,
    addToCart,
    name,
    image,
    secondaryText,
    derivedIsVeg,
    description,
    shopId,
    shopType,
    baseQuantity,
    unit,
    showUnavailableToast,
  ]);

  const handleVariantUpdate = useCallback((variant, changeAmount) => {
    const variantSuffix = variant.key.toLowerCase();
    const variantId = `${clientItemId}-${variantSuffix}`;
    if (changeAmount > 0) {
      increaseQty(variantId);
    } else {
      decreaseQty(variantId);
    }
  }, [clientItemId, increaseQty, decreaseQty]);

  const shouldShowOriginal = hasDiscount(
    hasHalfVariant ? fullPortionPrice ?? price : originalPrice ?? price,
    priceValue
  );

  const renderDefaultPortionControls = () => (
    <div className="portion-controls-container">
      {variantOptions?.map((variant) => {
        const variantCartItem = variant.key === 'half' ? halfCartItem : fullCartItem;
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
                  onClick={() => {
                    console.log('=== HALF/FULL CLICK START ===', {
                      variantKey: variant.key,
                      variantLabel: variant.label,
                      priceValue: variant.priceValue,
                      item: {
                        id,
                        clientItemId,
                        name,
                        price: priceValue ?? price,
                      },
                    });
                    handleVariantAdd(variant);
                  }}
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
        {showVariantPricing && showVariants && variantOptions ? (
          <div className="item-card-price-variants">
            {variantOptions.map((variant) => (
              <span key={variant.key} className="price-variant-text">
                {variant.label}: ₹{variant.formattedPrice}
              </span>
            ))}
          </div>
        ) : (
          <div className="item-card-price-inline">
            {shouldShowOriginal && (
              <span className="item-card-price-original">₹{formattedOriginalPrice}</span>
            )}
            <span className="item-card-price">
              {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
            </span>
          </div>
        )}
      </div>

      {!isInCart ? (
        <button
          className={`item-card-add-btn${orderingDisabled ? ' item-card-add-btn-disabled' : ''}`}
          type="button"
          disabled={orderingDisabled}
          onClick={handleAddToCart}
          aria-label={orderingDisabled ? 'Currently unavailable' : 'Add to cart'}
        >
          {appClosed ? 'Unavailable' : !isAvailable ? 'UNAVAILABLE' : 'Add'}
        </button>
      ) : (
        <div className="item-card-qty-controls">
          <button
            className="qty-btn-small"
            onClick={async () => {
              try { await decreaseQty(clientItemId); }
              catch (err) { if (err.code === 'APP_UNAVAILABLE') showUnavailableToast(err.message); }
            }}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="qty-display-small">{cartItem.quantity}</span>
          <button
            className="qty-btn-small"
            onClick={async () => {
              try { await increaseQty(clientItemId); }
              catch (err) { if (err.code === 'APP_UNAVAILABLE') showUnavailableToast(err.message); }
            }}
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
          const variantCartItem = variant.key === 'half' ? halfCartItem : fullCartItem;
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
                  disabled={orderingDisabled}
                  onClick={() => {
                    console.log('=== HALF/FULL CLICK START ===', {
                      variantKey: variant.key,
                      variantLabel: variant.label,
                      priceValue: variant.priceValue,
                      item: {
                        id,
                        clientItemId,
                        name,
                        price: priceValue ?? price,
                      },
                    });
                    handleVariantAdd(variant);
                  }}
                >
                  {appClosed ? 'Unavailable' : !isAvailable ? 'UNAVAILABLE' : 'Add'}
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

    return (
      <div className={`restaurant-footer-collapsed${hasVariantChips ? '' : ' restaurant-footer-single'}`}>
        {hasVariantChips && variantOptions && showVariants ? (
          <div className="restaurant-price-chip-row">
            {variantOptions.map((variant) => {
              const variantCartItem = variant.key === 'half' ? halfCartItem : fullCartItem;
              const variantQty = variantCartItem ? variantCartItem.quantity : 0;

              return (
                <div key={variant.key} className={`restaurant-price-chip ${variant.key}`}>
                  <span className="restaurant-chip-label">{variant.label}</span>
                  <div className="restaurant-chip-price-stack">
                    {variant.hasDiscount && variant.formattedOriginalPrice && (
                      <span className="restaurant-chip-original">₹{variant.formattedOriginalPrice}</span>
                    )}
                    <span className="restaurant-chip-final">
                      ₹{variant.formattedPrice}
                    </span>
                  </div>
                  {variantQty > 0 ? (
                    <div className="restaurant-qty-controls variant-qty-compact">
                      <button
                        onClick={() => decreaseQty(variant.key === 'half' ? `${clientItemId}-half` : `${clientItemId}-full`)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{variantQty}</span>
                      <button
                        onClick={() => increaseQty(variant.key === 'half' ? `${clientItemId}-half` : `${clientItemId}-full`)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="variant-add-btn"
                      type="button"
                      disabled={orderingDisabled}
                      onClick={() => {
                        console.log('=== HALF/FULL CLICK START ===', {
                          variantKey: variant.key,
                          variantLabel: variant.label,
                          priceValue: variant.priceValue,
                          item: {
                            id,
                            clientItemId,
                            name,
                            price: priceValue ?? price,
                          },
                        });
                        handleVariantAdd(variant);
                      }}
                    >
                      {appClosed ? 'Unavailable' : !isAvailable ? 'UNAVAILABLE' : 'Add'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="restaurant-price-variants-display">
            {variantOptions ? (
              variantOptions.map((variant) => (
                <div key={variant.key} className="restaurant-variant-preview">
                  <span className="restaurant-variant-label">{variant.label}</span>
                  <div className="restaurant-variant-price-stack">
                    {variant.hasDiscount && variant.formattedOriginalPrice && (
                      <span className="restaurant-variant-original">₹{variant.formattedOriginalPrice}</span>
                    )}
                    <span className="restaurant-variant-final">₹{variant.formattedPrice}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="restaurant-simple-price">
                {shouldShowOriginal && formattedOriginalPrice && (
                  <span className="restaurant-variant-original">₹{formattedOriginalPrice}</span>
                )}
                <span className="restaurant-variant-final">
                  {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
                </span>
              </div>
            )}
          </div>
        )}

        {hasVariantChips && showVariants ? null : (
          isInCart && !hasVariantChips && cartItem ? (
            <div className="restaurant-qty-controls restaurant-main-qty">
              <button onClick={() => decreaseQty(clientItemId)} aria-label="Decrease quantity">
                −
              </button>
              <span>{cartItem.quantity}</span>
              <button onClick={() => increaseQty(clientItemId)} aria-label="Increase quantity">
                +
              </button>
            </div>
          ) : null
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
    <div ref={cardRef} className={`item-card${!isAvailable ? ' item-card-disabled' : ''}${appClosed ? ' item-card-app-closed' : ''}${isRestaurantCard ? ' restaurant-card' : ''}`}>
      {availabilityToast && (
        <div className="item-card-availability-toast" role="alert" aria-live="assertive">
          🔒 {availabilityToast}
        </div>
      )}
      {optimizedImage && (
        <div className="item-card-image" style={{ aspectRatio: '4/3', height: 'auto', overflow: 'hidden' }}>
          <img src={optimizedImage} alt={name} loading="lazy" decoding="async" fetchPriority="low" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {showFoodIndicator && (
            <span
              className="food-type-indicator"
              aria-label={derivedIsVeg ? 'Vegetarian item' : 'Non-vegetarian item'}
              title={derivedIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <img
                src={derivedIsVeg ? '/vegy.webp' : '/nonveg.webp'}
                alt={derivedIsVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                draggable="false"
                style={{ width: 20, height: 20, verticalAlign: 'middle' }}
              />
            </span>
          )}
        </div>
      )}
      <div className="item-card-body">
        <div className="item-card-title-row">
          {/* legacy veg badge removed */}
          <h3 className="item-card-name">{name}</h3>
          {/* show info toggle: long descriptions OR grocery items with subtitle/description */}
          {(() => {
            const longDesc = description && description.split(/\s+/).filter(Boolean).length > 5;
            const showInfoForGrocery = !isRestaurantCard && (subtitle || description);
            const showInfoButton = Boolean(longDesc || showInfoForGrocery);
            return showInfoButton ? (
              <button
                type="button"
                className={`item-info-btn ${descPosition ? 'active' : ''}`}
                aria-pressed={!!descPosition}
                aria-label={descPosition ? 'Hide description' : 'Show full description'}
                onClick={(e) => {
                  e.stopPropagation();
                  setDescPosition((current) => (current ? null : { open: true }));
                }}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setDescPosition((current) => (current ? null : { open: true }));
                  }
                }}
                tabIndex={0}
              >
                <img src="/information.png" alt="info" className="item-info-icon" />
              </button>
            ) : null;
          })()}
        </div>

        {/* Show shop name (subtitle) and the item description separately so both are visible */}
        {subtitle && <p className="item-card-subtitle">{subtitle}</p>}
        {description && (
          <p className={`item-card-description`}>
            {description}
          </p>
        )}

        {hasRating && (
          <div className="item-card-rating" aria-label={`Rated ${numericAverageRating.toFixed(1)} out of 5 from ${numericReviewCount} reviews`}>
            <span className="item-card-rating-stars" aria-hidden="true">
              {STARS_ARRAY.map((index) => (
                <span
                  key={index}
                  className={`item-card-rating-star ${index < roundedRatingStars ? 'filled' : 'empty'}`}
                >
                  ★
                </span>
              ))}
            </span>
            <span className="item-card-rating-value">{numericAverageRating.toFixed(1)}</span>
            <span className="item-card-rating-count">({numericReviewCount})</span>
          </div>
        )}

        {/* Hide quantity/unit display for restaurant cards (e.g., "1 plate") */}
        {measureText && !isRestaurantCard && (
          <div className="item-card-measure" aria-label={`Quantity ${measureText}`}>
            {measureText}
          </div>
        )}

        {renderFooter()}

        {isRestaurantCard && !isInCart && !showVariants && (
          <div className="restaurant-add-under-body">
            <button
              className={`restaurant-add-main${orderingDisabled ? ' item-card-add-btn-disabled' : ''}`}
              type="button"
              disabled={orderingDisabled}
              onClick={handleAddToCart}
              aria-label={orderingDisabled ? 'Currently unavailable' : 'Add to cart'}
            >
              {appClosed ? 'Unavailable' : !isAvailable ? 'UNAVAILABLE' : 'Add'}
            </button>
          </div>
        )}
        {descPosition && createPortal(
          <div
            className="item-desc-modal"
            role="dialog"
            aria-modal="true"
            onClick={() => setDescPosition(null)}
          >
            <div
              className="item-desc-modal-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="item-desc-modal-media">
                {optimizedImage ? (
                  <img src={optimizedImage} alt={name} className="item-desc-modal-image" />
                ) : (
                  <div className="item-desc-modal-placeholder">{name ? name.charAt(0).toUpperCase() : '?'}</div>
                )}
                <button type="button" className="item-desc-modal-close" aria-label="Close description" onClick={() => setDescPosition(null)}>✕</button>
              </div>
              <div className="item-desc-modal-content">
                <div className="item-desc-modal-header">
                  <div className="item-desc-modal-toprow">
                    <div className="item-desc-modal-top-left">
                      {isRestaurantCard && (
                        <span className={`item-desc-modal-diet ${derivedIsVeg ? 'veg' : 'non-veg'}`}>
                          <span className="item-desc-modal-diet-dot" aria-hidden="true" />
                          {derivedIsVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      )}
                    </div>
                    <div className="item-desc-modal-top-right">
                      {subtitle && (
                        <p className="item-desc-modal-subtitle item-desc-modal-subtitle-header">{subtitle}</p>
                      )}
                    </div>
                  </div>
                  <h3 className="item-desc-modal-name">{name}</h3>
                </div>

                {showVariantPricing && variantOptions && (
                  <div className="item-desc-modal-variants">
                    {variantOptions.map((option) => (
                      <div key={option.key} className="item-desc-modal-variant-row">
                        <span className="item-desc-modal-variant-label">{option.label}</span>
                        <span className="item-desc-modal-variant-price">
                          {option.hasDiscount && option.originalValue != null && option.formattedOriginalPrice && (
                            <span className="item-desc-modal-price-original">₹{option.formattedOriginalPrice}</span>
                          )}
                          <span className="item-desc-modal-price-current">₹{option.formattedPrice}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!showVariantPricing && (
                  <div className="item-desc-modal-price-row">
                    {shouldShowOriginal && formattedOriginalPrice && (
                      <span className="item-desc-modal-price-original">₹{formattedOriginalPrice}</span>
                    )}
                    <span className="item-desc-modal-price-current">
                      {formattedPrice ? `₹${formattedPrice}` : 'Price unavailable'}
                    </span>
                  </div>
                )}

                {hasRating && (
                  <div className="item-desc-modal-rating" aria-label={`Rated ${numericAverageRating.toFixed(1)} out of 5 from ${numericReviewCount} reviews`}>
                    <span className="item-desc-modal-rating-stars" aria-hidden="true">
                      {STARS_ARRAY.map((index) => (
                        <span
                          key={index}
                          className={`item-desc-modal-rating-star ${index < roundedRatingStars ? 'filled' : 'empty'}`}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="item-desc-modal-rating-value">{numericAverageRating.toFixed(1)}</span>
                    <span className="item-desc-modal-rating-count">({numericReviewCount})</span>
                  </div>
                )}
                <div className="item-desc-modal-body">
                  <p>{description}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default React.memo(ItemCard);
