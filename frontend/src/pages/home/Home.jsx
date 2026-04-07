
import React, { useState, useEffect } from 'react';
import ImageScroller from '../../components/common/ImageScroller';
import HomeButtons from './HomeButtons';
import ItemCard from '../../components/common/ItemCard';
import { itemService } from '../../services/item.service';
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
    const normalized = itemsArray.map((item) => {
      if (!item) {
        console.warn('[normalizeItems] Null/undefined item detected, skipping');
        return null;
      }

      const shopType = item.shops?.business_type || '';
      const isRestaurant = shopType.toLowerCase() === 'restaurant';

      const baseOriginalPrice = isRestaurant
        ? item.full_price ?? item.price ?? null
        : item.price ?? null;

      const baseFinalPrice = isRestaurant
        ? item.full_final_price ??
          item.final_price ??
          computeFinalPrice(baseOriginalPrice, item.full_discount_type, item.full_discount_value) ??
          baseOriginalPrice
        : item.final_price ??
          computeFinalPrice(baseOriginalPrice, item.discount_type, item.discount_value) ??
          baseOriginalPrice;

      const halfPortionPrice = isRestaurant ? item.half_portion_price ?? null : null;
      const halfPortionFinalPrice = isRestaurant
        ? item.half_portion_final_price ??
          computeFinalPrice(halfPortionPrice, item.half_discount_type, item.half_discount_value) ??
          halfPortionPrice
        : null;

      const fullPortionPrice = isRestaurant ? item.full_price ?? baseOriginalPrice : undefined;
      const fullPortionFinalPrice = isRestaurant
        ? item.full_final_price ??
          computeFinalPrice(fullPortionPrice, item.full_discount_type, item.full_discount_value) ??
          fullPortionPrice
        : undefined;

      return {
        ...item,
        price: baseFinalPrice,
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
  const [groceryItems, setGroceryItems] = useState([]);
  const [restaurantItems, setRestaurantItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(SECTION_CONFIG.grocery.key);

  useEffect(() => {
    const fetchHomeItems = async () => {
      try {
        setLoading(true);
        setError('');

        // DEBUG: Check raw API response
        const response = await itemService.getHomeItems();
        console.log('[DEBUG] Raw response from itemService:', response);
        console.log('[DEBUG] response type:', typeof response);
        console.log('[DEBUG] response keys:', Object.keys(response || {}));

        // FIX: Response is already the data object, not wrapped in .data
        const payload = response || {};
        console.log('[DEBUG] Payload for normalization:', payload);
        console.log('[DEBUG] Grocery items from API:', payload.grocery_items);
        console.log('[DEBUG] Restaurant items from API:', payload.restaurant_items);

        const normalizedGrocery = normalizeItems(payload.grocery_items);
        const normalizedRestaurant = normalizeItems(payload.restaurant_items);

        console.log('[DEBUG] Normalized grocery items:', normalizedGrocery);
        console.log('[DEBUG] Normalized restaurant items:', normalizedRestaurant);

        setGroceryItems(normalizedGrocery);
        setRestaurantItems(normalizedRestaurant);
      } catch (err) {
        console.error('Error fetching home items:', err);
        setError(err.message || 'Failed to load items');
        setGroceryItems([]);
        setRestaurantItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeItems();
  }, []);

  const renderItemsSection = (title, items, emptyMessage) => {
    // Safety: ensure items is always an array
    const safeItems = Array.isArray(items) ? items : [];
    const itemCount = safeItems.length;
    
    console.log(`[renderItemsSection] Rendering ${title} with ${itemCount} items`);

    return (
      <div className="home-items-section">
        {loading ? (
          <div className="loading-message">Loading items...</div>
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
                  shopId={item.shopId}
                  shopType={item.shopType}
                  halfPortionPrice={item.halfPortionPrice}
                  halfPortionFinalPrice={item.halfPortionFinalPrice}
                  fullPortionPrice={item.fullPortionPrice}
                  fullPortionFinalPrice={item.fullPortionFinalPrice}
                  foodType={item.foodType}
                  isVeg={shouldShowVegIndicator ? derivedIsVeg : undefined}
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

  const activeItems = activeSection === SECTION_CONFIG.grocery.key ? groceryItems : restaurantItems;
  const { title, emptyMessage } = SECTION_CONFIG[activeSection];

  return (
    <div className="home-page">
      <ImageScroller />
      <HomeButtons />
      <div className="home-content">
        <h1 className="home-main-title">Welcome to Doorriing</h1>
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

        {renderItemsSection(title, activeItems, emptyMessage)}
      </div>
    </div>
  );
};

export default Home;
