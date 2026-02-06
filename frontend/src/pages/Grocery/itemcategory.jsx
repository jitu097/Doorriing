import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './itemcategory.css';

const ItemCategory = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  // Dummy shop data
  const shops = {
    1: { name: 'Govind General Store', location: 'Railway Colony', rating: 0, deliveryTime: '0, 20 mins' },
    2: { name: 'Fresh Market', location: 'Main Street', rating: 4.5, deliveryTime: '15, 30 mins' },
    3: { name: 'Daily Needs Store', location: 'Market Road', rating: 4.2, deliveryTime: '10, 25 mins' },
    4: { name: 'Organic Store', location: 'Green Valley', rating: 4.8, deliveryTime: '20, 35 mins' }
  };

  const shop = shops[shopId] || shops[1];

  // Dummy categories
  const categories = [
    { id: 1, name: 'Atta, Rice, Oil & Dals', icon: '🌾', color: '#FFF9E6' },
    { id: 2, name: 'Tea, Coffee & More', icon: '☕', color: '#FFE6E6' },
    { id: 3, name: 'Biscuits & Cookies', icon: '🍪', color: '#FFF0E6' },
    { id: 4, name: 'Sugar, Salt & Jaggery', icon: '🧂', color: '#E6F7E6' },
    { id: 5, name: 'Masala & Spices', icon: '🌶️', color: '#FFE6F0' },
    { id: 6, name: 'Dairy, Bread & Eggs', icon: '🥛', color: '#E6F3FF' },
    { id: 7, name: 'Packaged food', icon: '📦', color: '#FFF5E6' },
    { id: 8, name: 'Bath & Body', icon: '🧴', color: '#F0E6FF' },
    { id: 9, name: 'Hair care', icon: '💆', color: '#FFE6EB' },
    { id: 10, name: 'Cold Drinks & Juices', icon: '🥤', color: '#FFE6E6' },
    { id: 11, name: 'Cleaning Essentials', icon: '🧹', color: '#E6F9FF' },
    { id: 12, name: 'Grooming Essentials', icon: '💈', color: '#F5E6FF' },
    { id: 13, name: 'Fruits & Vegetables', icon: '🥬', color: '#E8F5E8' },
    { id: 14, name: 'Ice creams & more', icon: '🍦', color: '#FFF0F5' }
  ];

  return (
    <div className="item-category-page">
      {/* Header */}
      <div className="shop-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="shop-name">{shop.name}</h1>
        <div className="header-actions">
          <button className="icon-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12H20M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Shop Info */}
      <div className="shop-info">
        <div className="info-row">
          <span className="rating">
            <span className="star">⭐</span>
            {shop.rating} (0+ ratings)
            <span className="info-icon">ℹ️</span>
          </span>
        </div>
        <div className="info-row">
          <span className="delivery-info">
            <span className="icon">🕐</span>
            Approx. {shop.deliveryTime}
          </span>
          <span className="delivery-location">Delivery to Home</span>
        </div>
        <div className="info-row">
          <span className="location">
            <span className="icon">📍</span>
            {shop.location}
          </span>
        </div>
      </div>

      {/* Status Banner */}
      <div className="status-banner">
        <div className="banner-content">
          <span className="banner-icon">🔒</span>
          <div className="banner-text">
            <strong>SHUTTER IS DOWN</strong>
            <p>The outlet will open in next available slot</p>
          </div>
          <button className="see-slots-btn">SEE SLOTS</button>
        </div>
      </div>

      {/* Menu Section */}
      <div className="menu-section">
        <h2 className="menu-title">MENU</h2>
        <div className="categories-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card" style={{ backgroundColor: category.color }}>
              <div className="category-icon">{category.icon}</div>
              <p className="category-name">{category.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="footer-note">
        <p>An average active adult typically requires around 2000 kcal of energy per day, though individual calorie needs may vary.</p>
      </div>
    </div>
  );
};

export default ItemCategory;