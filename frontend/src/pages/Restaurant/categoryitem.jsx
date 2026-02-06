import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './categoryitem.css';

const CategoryItem = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();

  // Dummy restaurant data
  const restaurants = {
    1: { name: 'The Spice Kitchen', location: 'MG Road', rating: 4.5, deliveryTime: '25, 35 mins' },
    2: { name: 'Pizza Paradise', location: 'Downtown', rating: 4.3, deliveryTime: '30, 40 mins' },
    3: { name: 'Cafe Delight', location: 'Park Street', rating: 4.7, deliveryTime: '20, 30 mins' }
  };

  const restaurant = restaurants[restaurantId] || restaurants[1];

  // Dummy categories for restaurant
  const categories = [
    { id: 1, name: 'Starters & Appetizers', icon: '🥗', color: '#FFF9E6' },
    { id: 2, name: 'Main Course', icon: '🍛', color: '#FFE6E6' },
    { id: 3, name: 'Biryanis & Rice', icon: '🍚', color: '#FFF0E6' },
    { id: 4, name: 'Breads & Rotis', icon: '🫓', color: '#E6F7E6' },
    { id: 5, name: 'Chinese & Noodles', icon: '🍜', color: '#FFE6F0' },
    { id: 6, name: 'Pizza & Pasta', icon: '🍕', color: '#E6F3FF' },
    { id: 7, name: 'Burgers & Sandwiches', icon: '🍔', color: '#FFF5E6' },
    { id: 8, name: 'South Indian', icon: '🥞', color: '#F0E6FF' },
    { id: 9, name: 'Desserts', icon: '🍰', color: '#FFE6EB' },
    { id: 10, name: 'Beverages', icon: '🥤', color: '#FFE6E6' },
    { id: 11, name: 'Fresh Juices', icon: '🧃', color: '#E6F9FF' },
    { id: 12, name: 'Ice Cream', icon: '🍨', color: '#F5E6FF' },
    { id: 13, name: 'Salads & Healthy', icon: '🥙', color: '#E8F5E8' },
    { id: 14, name: 'Combos & Meals', icon: '🍱', color: '#FFF0F5' }
  ];

  const handleCategoryClick = (category) => {
    navigate(`/restaurant/shop/${restaurantId}/category/${category.id}`, {
      state: { categoryName: category.name }
    });
  };

  return (
    <div className="category-item-page">
      {/* Header */}
      <div className="restaurant-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="restaurant-name">{restaurant.name}</h1>
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

      {/* Restaurant Info */}
      <div className="restaurant-info">
        <div className="info-row">
          <span className="rating">
            <span className="star">⭐</span>
            {restaurant.rating} (0+ ratings)
            <span className="info-icon">ℹ️</span>
          </span>
        </div>
        <div className="info-row">
          <span className="delivery-info">
            <span className="icon">🕐</span>
            Approx. {restaurant.deliveryTime}
          </span>
          <span className="delivery-location">Delivery to Home</span>
        </div>
        <div className="info-row">
          <span className="location">
            <span className="icon">📍</span>
            {restaurant.location}
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
            <div 
              key={category.id} 
              className="category-card" 
              style={{ backgroundColor: category.color }}
              onClick={() => handleCategoryClick(category)}
            >
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

export default CategoryItem;