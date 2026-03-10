
import React, { useState, useEffect } from 'react';
import ImageScroller from '../../components/common/ImageScroller';
import HomeButtons from './HomeButtons';
import ItemCard from '../../components/common/ItemCard';
import { itemService } from '../../services/item.service';
import './Home.css';

const ITEMS_LIMIT = 10;

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
  (items || []).map((item) => ({
    ...item,
    shopId: item.shop_id,
    shopName: item.shops?.name || '',
    shopType: item.shops?.business_type || '',
  }));

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

        const response = await itemService.getHomeItems(ITEMS_LIMIT);
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
      <h2 className="section-title">{title}</h2>
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

            return (
              <ItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                image={item.image_url}
                isAvailable={item.is_available}
                stockQuantityLabel={stockLabel}
                stockQuantityValue={item.stock_quantity}
                shopId={item.shopId}
                shopType={item.shopType}
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

  return (
    <div className="home-page">
      <ImageScroller />
      <HomeButtons />
      <div className="home-content">
        <h1>Welcome to BazarSe</h1>
        <p>Your local marketplace</p>
        
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
