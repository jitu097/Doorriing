
import React, { useState, useEffect, useMemo } from 'react';
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

const normalizeItems = (items = []) =>
  (items || []).map((item) => {
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
  });

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

        const response = await itemService.getHomeItems();
        const payload = response?.data || {};

        setGroceryItems(normalizeItems(payload.grocery_items));
        setRestaurantItems(normalizeItems(payload.restaurant_items));
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

  const renderItemsSection = (title, items, emptyMessage) => (
    <div className="home-items-section">
      {loading ? (
        <div className="loading-message">Loading items...</div>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : items.length > 0 ? (
        <div className="items-grid">
          {items.map(item => {
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

  const activeItems = activeSection === SECTION_CONFIG.grocery.key ? groceryItems : restaurantItems;
  const { title, emptyMessage } = SECTION_CONFIG[activeSection];

  // Memoize the rendered section to avoid recalculation
  const renderedSection = useMemo(
    () => renderItemsSection(title, activeItems, emptyMessage),
    [activeItems, emptyMessage, error, loading, title]
  );

  // Memoize the toggle buttons
  const toggleButtons = useMemo(
    () => (
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
    ),
    [activeSection]
  );
  return (
    <div className="home-page">
      <ImageScroller />
      <HomeButtons />
      <div className="home-content">
        {toggleButtons}
        {renderedSection}
      </div>
    </div>
  );
};

export default Home;
