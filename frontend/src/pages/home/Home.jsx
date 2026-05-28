
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
// Image scroller temporarily disabled for dashboard. Commented out to hide it from UI.
// import ImageScroller from '../../components/common/ImageScroller';
import ItemCard from '../../components/common/ItemCard';
import ItemCardSkeleton, { ItemCardSkeletonGrid } from '../../components/common/ItemCardSkeleton';
// OrderNotification is only shown when there's an active recent order.
// Lazy-loading it avoids including its dependency (orderService) in the critical path bundle.
const OrderNotification = lazy(() => import('../../components/common/OrderNotification'));
import ShopCard from '../shopcard/shopcard';
import { itemService } from '../../services/item.service';
import { getCachedHomeShops, getHomeShops } from '../../services/shop.service';
import { getDashboardCategories, getDashboardCategoryItems } from '../../services/category.service';
import { useAppAvailability } from '../../context/AppAvailabilityContext';
import './Home.css';
import { computeFinalPrice } from '../../utils/pricing';

// Null fallback for the lazy OrderNotification — avoids flicker since the
// component only renders when an order is already active.
const NoFallback = () => null;



const SECTION_CONFIG = {
  grocery: {
    key: 'grocery',
    title: 'Fresh Grocery Items',
    emptyMessage: 'No grocery items available at the moment.',
  },
  restaurant: {
    key: 'restaurant',
    title: 'Restaurant Specials',
    emptyMessage: 'No restaurant items available right now.',
  },
};

const normalizeItems = (items = []) => {
  // Safety check: ensure items is an array
  const itemsArray = Array.isArray(items) ? items : [];
  
  if (itemsArray.length === 0) {
    console.log('[normalizeItems] Empty array received, returning empty array');
    return [];
  }

  try {
    // Filter out items whose shop appears closed or inactive
    const isShopOpen = (it) => {
      if (!it) return false;
      const shop = it.shops || {};
      if (shop.is_active === false) return false;
      if (shop.is_open === false) return false;
      if (shop.status && String(shop.status).toLowerCase() === 'closed') return false;
      if (it.shop_active === false) return false;
      if (it.shop_status && String(it.shop_status).toLowerCase() === 'closed') return false;
      return true;
    };

    const filteredItems = itemsArray.filter(isShopOpen);

    const normalized = filteredItems.map((item) => {
      if (!item) {
        console.warn('[normalizeItems] Null/undefined item detected, skipping');
        return null;
      }

      const shopType = item.shops?.business_type || '';
      const isRestaurant = shopType.toLowerCase() === 'restaurant';

      // Variant detection: an item has Half/Full variants when half_portion_price
      // is set (non-null). Matches ItemCard's own hasHalfVariant check exactly.
      const hasHalfPrice = isRestaurant && item.half_portion_price != null;

      let baseOriginalPrice, baseFinalPrice, halfPortionPrice, halfPortionFinalPrice,
          fullPortionPrice, fullPortionFinalPrice;

      if (hasHalfPrice) {
        // Variant restaurant product: full_price is the "full" portion price
        // Only use full_* discount chain — never fall back to final_price
        baseOriginalPrice = item.full_price ?? item.price ?? null;
        baseFinalPrice =
          item.full_final_price ??
          computeFinalPrice(item.full_price, item.full_discount_type, item.full_discount_value) ??
          item.full_price ??
          item.price ??
          null;

        halfPortionPrice = item.half_portion_price ?? null;
        halfPortionFinalPrice =
          item.half_portion_final_price ??
          computeFinalPrice(halfPortionPrice, item.half_discount_type, item.half_discount_value) ??
          halfPortionPrice;

        fullPortionPrice = baseOriginalPrice;
        fullPortionFinalPrice = baseFinalPrice;
      } else if (isRestaurant) {
        // Simple restaurant product — prefer full_price chain if full_price is set
        baseOriginalPrice = item.full_price ?? item.price ?? null;

        baseFinalPrice = item.full_price != null
          ? (
              // Seller used full_price → use full_* chain (never final_price)
              item.full_final_price ??
              computeFinalPrice(item.full_price, item.full_discount_type, item.full_discount_value) ??
              item.full_price
            )
          : (
              // Seller used plain price field
              item.final_price ??
              computeFinalPrice(item.price, item.discount_type, item.discount_value) ??
              item.price ??
              null
            );

        halfPortionPrice = null;
        halfPortionFinalPrice = null;
        fullPortionPrice = null;
        fullPortionFinalPrice = null;
      } else {
        // Grocery or other product
        baseOriginalPrice = item.price ?? null;
        baseFinalPrice =
          item.final_price ??
          computeFinalPrice(baseOriginalPrice, item.discount_type, item.discount_value) ??
          baseOriginalPrice;

        halfPortionPrice = null;
        halfPortionFinalPrice = null;
        fullPortionPrice = undefined;
        fullPortionFinalPrice = undefined;
      }

      // Safe price — skip ₹0 when original is clearly non-zero
      // (protects against stale full_final_price=0 or wrong discount stored in DB)
      const rawSafePrice = baseFinalPrice ?? baseOriginalPrice ?? 0;
      const safePrice = (Number(rawSafePrice) > 0)
        ? rawSafePrice
        : (Number(baseOriginalPrice) > 0 ? baseOriginalPrice : rawSafePrice);

      return {
        ...item,
        baseQuantity: item.base_quantity ?? item.baseQuantity ?? null,
        unit: item.unit ?? null,
        price: safePrice,
        originalPrice: baseOriginalPrice,
        shopId: item.shop_id,
        shopName: item.shops?.name || '',
        shopType,
        halfPortionPrice,
        halfPortionFinalPrice,
        fullPortionPrice,
        fullPortionFinalPrice,
        foodType: item.food_type,
      };
    }).filter(item => item !== null); // Remove any null items

    console.log(`[normalizeItems] Normalized ${normalized.length} items from ${itemsArray.length} input items`);
    return normalized;
  } catch (error) {
    console.error('[normalizeItems] Error during normalization:', error);
    // Fallback: return original items if normalization fails
    return itemsArray;
  }
};

const Home = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  // Detect reduced-motion once at mount — stored in a ref to avoid re-renders.
  // Used by ShopsSection to disable the infinite carousel animation on low-power devices.
  const reducedMotionRef = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Try to restore cached dashboard data for instant render
  const cachedHomeShops = getCachedHomeShops();
  const cachedHomeItems = itemService.getCachedHomeItems?.() || null;
  const hasCache = !!(
    (cachedHomeShops && (cachedHomeShops.grocery?.length > 0 || cachedHomeShops.restaurant?.length > 0)) &&
    (cachedHomeItems && (cachedHomeItems.grocery_items?.length > 0 || cachedHomeItems.restaurant_items?.length > 0))
  );

  const [groceryItems, setGroceryItems] = useState(() => normalizeItems(cachedHomeItems?.grocery_items || []));
  const [restaurantItems, setRestaurantItems] = useState(() => normalizeItems(cachedHomeItems?.restaurant_items || []));
  const [groceryShops, setGroceryShops] = useState(() => cachedHomeShops?.grocery || []);
  const [restaurantShops, setRestaurantShops] = useState(() => cachedHomeShops?.restaurant || []);
  const [dashboardCategories, setDashboardCategories] = useState([]);
  const [activeDashboardCategory, setActiveDashboardCategory] = useState(null);
  const [activeCategoryItems, setActiveCategoryItems] = useState([]);
  const [activeCategoryLoading, setActiveCategoryLoading] = useState(false);
  const [activeCategoryError, setActiveCategoryError] = useState('');
  const [loading, setLoading] = useState(!hasCache);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(SECTION_CONFIG.restaurant.key);
  const [pageVisible, setPageVisible] = useState(() => (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  ));
  const categoryItemsRequestRef = useRef(0);

  const mergeShopPayload = (currentValue, nextValue) => {
    if (Array.isArray(nextValue) && nextValue.length > 0) {
      return nextValue;
    }

    return Array.isArray(currentValue) ? currentValue : [];
  };

  const applyShopUpdate = (shopsData = {}) => {
    setGroceryShops((currentValue) => mergeShopPayload(currentValue, shopsData.grocery));
    setRestaurantShops((currentValue) => mergeShopPayload(currentValue, shopsData.restaurant));
  };

  const closeDashboardCategory = useCallback(() => {
    categoryItemsRequestRef.current += 1;
    setActiveDashboardCategory(null);
    setActiveCategoryItems([]);
    setActiveCategoryError('');
    setActiveCategoryLoading(false);
  }, []);

  const handleDashboardCategoryClick = useCallback(async (category) => {
    if (!category?.name) {
      return;
    }

    const requestId = categoryItemsRequestRef.current + 1;
    categoryItemsRequestRef.current = requestId;

    setActiveDashboardCategory(category);
    setActiveCategoryItems([]);
    setActiveCategoryError('');
    setActiveCategoryLoading(true);

    try {
      const categoryDetails = await getDashboardCategoryItems(category.name);

      if (categoryItemsRequestRef.current !== requestId) {
        return;
      }

      const normalizedItems = normalizeItems(categoryDetails?.items || []);
      setActiveCategoryItems(normalizedItems);
    } catch (fetchError) {
      if (categoryItemsRequestRef.current !== requestId) {
        return;
      }

      setActiveCategoryError(fetchError.message || 'Unable to load items for this category.');
      setActiveCategoryItems([]);
    } finally {
      if (categoryItemsRequestRef.current === requestId) {
        setActiveCategoryLoading(false);
      }
    }
  }, []);

  // ── Global App Availability ───────────────────────────────────────────────
  // Polled every 30s by AppAvailabilityProvider at the app root.
  // isOpen is optimistically true during initial load (isLoading=true).
  const { isOpen: appIsOpen, isLoading: appAvailabilityLoading, reason: appReason, blockedBy } = useAppAvailability();
  // Show banner only when we have a confirmed closed state (not still loading first poll)
  const showUnavailableBanner = !appAvailabilityLoading && !appIsOpen;

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        if (!hasCache) {
          setLoading(true);
        }
        setError('');

        // 1. Fetch shops and categories first (above-the-fold content)
        const [shopsResult, categoriesResult] = await Promise.allSettled([
          getHomeShops(8),
          getDashboardCategories(),
        ]);

        if (shopsResult.status === 'fulfilled') {
          applyShopUpdate(shopsResult.value);
        } else {
          console.error('Error fetching shops:', shopsResult.reason);
        }

        if (categoriesResult.status === 'fulfilled') {
          setDashboardCategories(Array.isArray(categoriesResult.value) ? categoriesResult.value : []);
        } else {
          console.error('Error fetching dashboard categories:', categoriesResult.reason);
          setDashboardCategories([]);
        }

        // Reveal layout with shops as soon as they are ready
        if (!hasCache) {
          setLoading(false);
        }

        // 2. Fetch items (below-the-fold content, staggered by 50ms to prioritize network/rendering threads)
        await new Promise((resolve) => setTimeout(resolve, 50));

        try {
          const itemPayload = await itemService.getHomeItems();
          setGroceryItems(normalizeItems(itemPayload.grocery_items));
          setRestaurantItems(normalizeItems(itemPayload.restaurant_items));
        } catch (itemError) {
          console.error('Error fetching home items:', itemError);
          setError(itemError.message || 'Failed to load items');
          setGroceryItems([]);
          setRestaurantItems([]);
        }
      } catch (err) {
        console.error('Unexpected error fetching home data:', err);
        setError(err.message || 'Failed to load home data');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Silent refresh listener for Stale-While-Revalidate (SWR) updates
  useEffect(() => {
    const handleItemsRefreshed = (e) => {
      const itemPayload = e.detail || {};
      setGroceryItems(normalizeItems(itemPayload.grocery_items));
      setRestaurantItems(normalizeItems(itemPayload.restaurant_items));
    };

    const handleShopsRefreshed = (e) => {
      const shopsData = e.detail || {};
      applyShopUpdate(shopsData);
    };

    window.addEventListener('home-items-refreshed', handleItemsRefreshed);
    window.addEventListener('home-shops-refreshed', handleShopsRefreshed);

    return () => {
      window.removeEventListener('home-items-refreshed', handleItemsRefreshed);
      window.removeEventListener('home-shops-refreshed', handleShopsRefreshed);
    };
  }, []);

// ── STANDALONE MEMOIZED COMPONENTS ──────────────────────────────────────────

const ShopsSection = React.memo(({ shops, businessType, reducedMotion }) => {
  const safeShops = Array.isArray(shops) ? shops : [];
  const shopsCount = safeShops.length;
  const isEmpty = shopsCount === 0;
  const scrollingShops = useMemo(() => {
    if (isEmpty) return [];
    return [...safeShops, ...safeShops];
  }, [safeShops, isEmpty]);

  // Measure the scroll track and set a CSS variable with half the scrollWidth
  // so the CSS animation can translate by an exact pixel value and avoid
  // visible seams or empty gaps between duplicated content.
  const trackRef = useRef(null);

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl || reducedMotion || isEmpty) return;

    const updateScrollDistance = () => {
      try {
        const half = Math.round(trackEl.scrollWidth / 2);
        trackEl.style.setProperty('--scroll-distance', `${half}px`);
      } catch (e) {
        // Ignore measurement errors in rare environments
      }
    };

    updateScrollDistance();
    window.addEventListener('resize', updateScrollDistance);
    return () => window.removeEventListener('resize', updateScrollDistance);
  }, [scrollingShops, reducedMotion, isEmpty]);

  return (
    <div className={`home-shops-section${isEmpty ? ' home-shops-section-empty' : ''}`}>
      <h6 className={`shops-section-title ${businessType === 'grocery' ? 'shops-section-title-grocery' : ''}`}>
        {businessType === 'grocery' ? (
          <> Explore Shops</>
        ) : (
          <> Top Restaurants</>
        )}
      </h6>
      <div className="shops-carousel-container">
        {/* Apply no-animation class when user prefers reduced motion */}
        <div
          ref={trackRef}
          className={`shops-carousel-track${reducedMotion || isEmpty ? ' shops-carousel-no-anim' : ''}`}
        >
          {scrollingShops.map((shop, index) => (
            <div
              key={`${shop.id}-${index}`}
              className={`shops-carousel-item ${businessType === 'grocery' ? 'shops-carousel-item-grocery' : ''}`}
            >
              <ShopCard
                shop={shop}
                routePrefix={businessType}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

ShopsSection.displayName = 'ShopsSection';

const CategoriesSection = React.memo(({ categories, onCategoryClick }) => {
  const safeCategories = Array.isArray(categories) ? categories : [];

  if (safeCategories.length === 0) {
    return null;
  }

  return (
    <div className="home-categories-section">
      <h6 className="home-categories-title">Categories</h6>
      <div className="home-categories-grid">
        {safeCategories.map((category) => {
          const initial = (category?.name || '?').trim().charAt(0).toUpperCase() || '?';

          return (
            <button key={category.id} type="button" className="home-category-card" onClick={() => onCategoryClick(category)}>
              <div className="home-category-icon-wrap">
                {category.image_url ? (
                  <div
                    className="home-category-image"
                    style={{ backgroundImage: `url(${category.image_url})` }}
                    role="img"
                    aria-label={category.name}
                  />
                ) : (
                  <span className="home-category-fallback">{initial}</span>
                )}
              </div>
              <div className="home-category-meta">
                <span className="home-category-name">{category.name}</span>
                <span className="home-category-count">
                  {category.shop_count === 1 ? '1 shop' : `${category.shop_count || 0} shops`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

CategoriesSection.displayName = 'CategoriesSection';

const ItemsSection = React.memo(({ title, items, emptyMessage, loading, error }) => {
  const safeItems = Array.isArray(items) ? items : [];
  const itemCount = safeItems.length;

  return (
    <div className="home-items-section">
      {title && <h2 className="home-items-title">{title}</h2>}
      {loading ? (
        <ItemCardSkeletonGrid count={8} />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : itemCount > 0 ? (
        <div className="items-grid">
          {safeItems.map(item => {
            const stockLabel = typeof item.stock_quantity === 'number'
              ? (item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of stock')
              : undefined;
            const normalizedFoodType = (item.foodType || '').toLowerCase();
            const derivedIsVeg = normalizedFoodType
              ? normalizedFoodType !== 'nonveg'
              : (typeof item.is_veg === 'boolean' ? item.is_veg : true);
            const shouldShowVegIndicator = (item.shopType || '').toLowerCase() === 'restaurant';

            return (
              <ItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                subtitle={item.shopName}
                description={item.description}
                price={item.price}
                originalPrice={item.originalPrice}
                image={item.image_url}
                isAvailable={item.is_available}
                stockQuantityLabel={stockLabel}
                stockQuantityValue={item.stock_quantity}
                averageRating={item.average_rating}
                reviewCount={item.review_count}
                shopId={item.shopId}
                shopType={item.shopType}
                halfPortionPrice={item.halfPortionPrice}
                halfPortionFinalPrice={item.halfPortionFinalPrice}
                fullPortionPrice={item.fullPortionPrice}
                fullPortionFinalPrice={item.fullPortionFinalPrice}
                foodType={item.foodType}
                is_sweets={item.is_sweets}
                isVeg={shouldShowVegIndicator ? derivedIsVeg : undefined}
                baseQuantity={item.baseQuantity}
                unit={item.unit}
              />
            );
          })}
        </div>
      ) : (
        <p className="no-items-message">{emptyMessage}</p>
      )}
    </div>
  );
});

ItemsSection.displayName = 'ItemsSection';

const CategoryItemsModal = React.memo(({ category, items, loading, error, onClose }) => {
  if (!category) {
    return null;
  }

  return (
    <div className="home-category-modal" role="dialog" aria-modal="true" aria-label={`${category.name} items`} onClick={onClose}>
      <div className="home-category-modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="home-category-modal-header">
          <div>
            <p className="home-category-modal-kicker">Category</p>
            <h3 className="home-category-modal-title">{category.name}</h3>
            <p className="home-category-modal-subtitle">
              {loading ? 'Loading items...' : `${items.length} items available`}
            </p>
          </div>
          <button type="button" className="home-category-modal-close" onClick={onClose} aria-label="Close category items">
            ×
          </button>
        </div>

        <div className="home-category-modal-body">
          {error ? (
            <p className="error-message">{error}</p>
          ) : loading ? (
            <ItemCardSkeletonGrid count={8} />
          ) : items.length > 0 ? (
            <div className="items-grid home-category-modal-grid">
              {items.map((item) => {
                const stockLabel = typeof item.stock_quantity === 'number'
                  ? (item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of stock')
                  : undefined;
                const normalizedFoodType = (item.foodType || '').toLowerCase();
                const derivedIsVeg = normalizedFoodType
                  ? normalizedFoodType !== 'nonveg'
                  : (typeof item.is_veg === 'boolean' ? item.is_veg : true);
                const shouldShowVegIndicator = (item.shopType || '').toLowerCase() === 'restaurant';

                return (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    subtitle={item.shopName}
                    description={item.description}
                    price={item.price}
                    originalPrice={item.originalPrice}
                    image={item.image_url}
                    isAvailable={item.is_available}
                    stockQuantityLabel={stockLabel}
                    stockQuantityValue={item.stock_quantity}
                    averageRating={item.average_rating}
                    reviewCount={item.review_count}
                    shopId={item.shopId}
                    shopType={item.shopType}
                    halfPortionPrice={item.halfPortionPrice}
                    halfPortionFinalPrice={item.halfPortionFinalPrice}
                    fullPortionPrice={item.fullPortionPrice}
                    fullPortionFinalPrice={item.fullPortionFinalPrice}
                    foodType={item.foodType}
                    is_sweets={item.is_sweets}
                    isVeg={shouldShowVegIndicator ? derivedIsVeg : undefined}
                    baseQuantity={item.baseQuantity}
                    unit={item.unit}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-items-message">No items found for this category yet.</p>
          )}
        </div>
      </div>
    </div>
  );
});

CategoryItemsModal.displayName = 'CategoryItemsModal';

// ─────────────────────────────────────────────────────────────────────────────


  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const combinedSearchableItems = useMemo(() => {
    return [...groceryItems, ...restaurantItems];
  }, [groceryItems, restaurantItems]);

  const filteredItems = useMemo(() => {
    const activeItems = activeSection === SECTION_CONFIG.grocery.key ? groceryItems : restaurantItems;
    
    if (!normalizedSearchQuery) {
      return activeItems;
    }
    
    return combinedSearchableItems.filter(item => {
      const itemName = (item?.name || '').toLowerCase();
      const shopName = (item?.shopName || item?.shops?.name || '').toLowerCase();
      const description = (item?.description || '').toLowerCase();
      
      return (
        itemName.includes(normalizedSearchQuery) ||
        shopName.includes(normalizedSearchQuery) ||
        description.includes(normalizedSearchQuery)
      );
    });
  }, [activeSection, groceryItems, restaurantItems, combinedSearchableItems, normalizedSearchQuery]);

  const title = normalizedSearchQuery ? 'Search Results' : SECTION_CONFIG[activeSection].title;
  const emptyMessage = normalizedSearchQuery
    ? 'No products or shops match your search.'
    : SECTION_CONFIG[activeSection].emptyMessage;

  const handleSectionChange = useCallback((sectionKey) => {
    if (sectionKey === activeSection) return;
    setActiveSection(sectionKey);
  }, [activeSection]);

  return (
    <div className="home-page">
      {/* ── Unavailability Banner ──────────────────────────────────────── */}
      {showUnavailableBanner && (
        <div className="home-unavailability-banner" role="alert">
          <span className="home-unavailability-icon">
            {blockedBy === 'time_window' ? '🕐' : '🔒'}
          </span>
          <div className="home-unavailability-text">
            <strong className="home-unavailability-title">
              {blockedBy === 'time_window'
                ? 'Outside Delivery Hours'
                : 'Currently Unavailable for Orders'}
            </strong>
            <span className="home-unavailability-sub">
              {appReason ||
                'We are currently not accepting orders. You can still browse available shops.'}
            </span>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* ImageScroller disabled: remove the comment below to re-enable */}
      {/* <ImageScroller /> */}
      {/* OrderNotification is lazy — only fetched when an active order exists */}
      <Suspense fallback={<NoFallback />}>
        <OrderNotification />
      </Suspense>
      <div className="home-content">
        {!searchQuery && (
          <h1 className="home-main-title"></h1>
        )}

        {!searchQuery && <CategoriesSection categories={dashboardCategories} onCategoryClick={handleDashboardCategoryClick} />}

        {activeDashboardCategory && (
          <CategoryItemsModal
            category={activeDashboardCategory}
            items={activeCategoryItems}
            loading={activeCategoryLoading}
            error={activeCategoryError}
            onClose={closeDashboardCategory}
          />
        )}
        
        {/* Display Shops Sections */}
        {!searchQuery && (
          <>
            <ShopsSection shops={groceryShops} businessType="grocery" reducedMotion={reducedMotionRef.current || !pageVisible} />
            <ShopsSection shops={restaurantShops} businessType="restaurant" reducedMotion={reducedMotionRef.current || !pageVisible} />
          </>
        )}

        {/* Items Section with Toggle */}
        <div className="home-section-toggle">
          <button
            type="button"
            className={`home-toggle-btn ${activeSection === SECTION_CONFIG.grocery.key ? 'is-active' : ''}`}
            onClick={() => handleSectionChange(SECTION_CONFIG.grocery.key)}
          >
            Fresh Grocery Items
          </button>
          <button
            type="button"
            className={`home-toggle-btn ${activeSection === SECTION_CONFIG.restaurant.key ? 'is-active' : ''}`}
            onClick={() => handleSectionChange(SECTION_CONFIG.restaurant.key)}
          >
            Restaurant Specials
          </button>
        </div>

        <ItemsSection
          title={title}
          items={filteredItems}
          emptyMessage={emptyMessage}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default Home;
