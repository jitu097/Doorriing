
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ImageScroller from '../../components/common/ImageScroller';
import ItemCard from '../../components/common/ItemCard';
import ItemCardSkeleton, { ItemCardSkeletonGrid } from '../../components/common/ItemCardSkeleton';
import OrderNotification from '../../components/common/OrderNotification';
import ShopCard from '../shopcard/shopcard';
import { itemService } from '../../services/item.service';
import { getHomeShops } from '../../services/shop.service';
import { useAppAvailability } from '../../context/AppAvailabilityContext';
import './Home.css';
import { computeFinalPrice } from '../../utils/pricing';

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
  const [groceryItems, setGroceryItems] = useState([]);
  const [restaurantItems, setRestaurantItems] = useState([]);
  const [groceryShops, setGroceryShops] = useState([]);
  const [restaurantShops, setRestaurantShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(SECTION_CONFIG.grocery.key);
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset pagination when section or search changes
  useEffect(() => {
    setVisibleCount(20);
  }, [activeSection, searchQuery]);

  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setVisibleCount(prev => prev + 20);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
        setLoading(true);
        setError('');

        // Fetch items and shops in parallel
        const [itemResponseResult, shopsDataResult] = await Promise.allSettled([
          itemService.getHomeItems(),
          getHomeShops(8)
        ]);

        if (itemResponseResult.status === 'fulfilled') {
          const itemPayload = itemResponseResult.value || {};
          setGroceryItems(normalizeItems(itemPayload.grocery_items));
          setRestaurantItems(normalizeItems(itemPayload.restaurant_items));
        } else {
          console.error('Error fetching home items:', itemResponseResult.reason);
          setError(itemResponseResult.reason?.message || 'Failed to load items');
          setGroceryItems([]);
          setRestaurantItems([]);
        }

        if (shopsDataResult.status === 'fulfilled') {
          const shopsData = shopsDataResult.value;
          setGroceryShops(shopsData.grocery || []);
          setRestaurantShops(shopsData.restaurant || []);
        } else {
          console.error('Error fetching shops:', shopsDataResult.reason);
          setGroceryShops([]);
          setRestaurantShops([]);
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

  // Silent refresh listener for Stale-While-Revalidate (SWR) updates
  useEffect(() => {
    const handleItemsRefreshed = (e) => {
      const itemPayload = e.detail || {};
      setGroceryItems(normalizeItems(itemPayload.grocery_items));
      setRestaurantItems(normalizeItems(itemPayload.restaurant_items));
    };

    const handleShopsRefreshed = (e) => {
      const shopsData = e.detail || {};
      setGroceryShops(shopsData.grocery || []);
      setRestaurantShops(shopsData.restaurant || []);
    };

    window.addEventListener('home-items-refreshed', handleItemsRefreshed);
    window.addEventListener('home-shops-refreshed', handleShopsRefreshed);

    return () => {
      window.removeEventListener('home-items-refreshed', handleItemsRefreshed);
      window.removeEventListener('home-shops-refreshed', handleShopsRefreshed);
    };
  }, []);

  const renderItemsSection = (title, items, emptyMessage) => {
    // Safety: ensure items is always an array
    const safeItems = Array.isArray(items) ? items : [];
    const itemCount = safeItems.length;
    
    console.log(`[renderItemsSection] Rendering ${title} with ${itemCount} items`);

    return (
      <div className="home-items-section">
        {loading ? (
          // Show skeleton loaders while loading
          <ItemCardSkeletonGrid count={8} />
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : itemCount > 0 ? (
          <div className="items-grid">
            {safeItems.slice(0, visibleCount).map(item => {
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
  };

  const renderShopsSection = (shops, businessType) => {
    const safeShops = Array.isArray(shops) ? shops : [];
    const shopsCount = safeShops.length;

    if (shopsCount === 0) {
      return null;
    }

    // Duplicate shops for continuous scrolling effect
    const scrollingShops = [...safeShops, ...safeShops];

    return (
      <div className="home-shops-section">
        <h6 className={`shops-section-title ${businessType === 'grocery' ? 'shops-section-title-grocery' : ''}`}>
          {businessType === 'grocery' ? (
            <>
              {' Explore Shops'}
              
            </>
          ) : (
            ' Top Restaurants'
          )}
        </h6>
        <div className="shops-carousel-container">
          <div className="shops-carousel-track">
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
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    const activeItems = activeSection === SECTION_CONFIG.grocery.key ? groceryItems : restaurantItems;
    
    if (!normalizedSearchQuery) {
      return activeItems;
    }
    
    const searchableItems = [...groceryItems, ...restaurantItems];
    
    return searchableItems.filter(item => {
      const itemName = (item?.name || '').toLowerCase();
      const shopName = (item?.shopName || item?.shops?.name || '').toLowerCase();
      const description = (item?.description || '').toLowerCase();
      
      return (
        itemName.includes(normalizedSearchQuery) ||
        shopName.includes(normalizedSearchQuery) ||
        description.includes(normalizedSearchQuery)
      );
    });
  }, [activeSection, groceryItems, restaurantItems, normalizedSearchQuery]);

  const title = normalizedSearchQuery ? 'Search Results' : SECTION_CONFIG[activeSection].title;
  const emptyMessage = normalizedSearchQuery
    ? 'No products or shops match your search.'
    : SECTION_CONFIG[activeSection].emptyMessage;

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
      <ImageScroller />
      <OrderNotification />
      <div className="home-content">
        {!searchQuery && (
          <h1 className="home-main-title"></h1>
        )}
        
        {/* Display Shops Sections */}
        {!searchQuery && !loading && (
          <>
            {renderShopsSection(groceryShops, 'grocery')}
            {renderShopsSection(restaurantShops, 'restaurant')}
          </>
        )}

        {/* Items Section with Toggle */}
        <div className="home-section-toggle">
          <button
            type="button"
            className={`home-toggle-btn ${activeSection === SECTION_CONFIG.grocery.key ? 'is-active' : ''}`}
            onClick={() => setActiveSection(SECTION_CONFIG.grocery.key)}
          >
            Fresh Grocery Items
          </button>
          <button
            type="button"
            className={`home-toggle-btn ${activeSection === SECTION_CONFIG.restaurant.key ? 'is-active' : ''}`}
            onClick={() => setActiveSection(SECTION_CONFIG.restaurant.key)}
          >
            Restaurant Specials
          </button>
        </div>

        {renderItemsSection(title, filteredItems, emptyMessage)}
      </div>
    </div>
  );
};

export default Home;
