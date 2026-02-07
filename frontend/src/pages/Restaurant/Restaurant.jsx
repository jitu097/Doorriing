import React, { useState } from 'react';
import './Restaurant.css';
import RestaurantCard from '../Restaurantcard/card';

const Restaurant = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Categories
  const categories = [
    'All',
    'Vegetable Shop',
    'General Store',
    'Fruit Shop',
    'Electronics Groceries',
    'Cosmetics',
    'Dairy Products',
    'Others'
  ];

  // Dummy data for restaurant cards
  const dummyRestaurants = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      title: 'The Spice Kitchen',
      description: 'Serving items across 25 categories',
      category: 'General Store'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
      title: 'Pizza Paradise',
      description: 'Serving items across 15 categories',
      category: 'Vegetable Shop'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
      title: 'Cafe Delight',
      description: 'Serving items across 18 categories',
      category: 'Fruit Shop'
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
      title: 'Fresh Mart',
      description: 'Serving items across 20 categories',
      category: 'General Store'
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400',
      title: 'Electronics Hub',
      description: 'Serving items across 12 categories',
      category: 'Electronics Groceries'
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400',
      title: 'Beauty Store',
      description: 'Serving items across 15 categories',
      category: 'Cosmetics'
    }
  ];

  // Filter restaurants based on selected category
  const filteredRestaurants = selectedCategory === 'All'
    ? dummyRestaurants
    : dummyRestaurants.filter(restaurant => restaurant.category === selectedCategory);

  return (
    <div>
      <div className="restaurant-curve-bg">
        <div className="restaurant-content">
          <h2>Restaurant Section</h2>
          <p>Order delicious food from your favorite restaurants!</p>
        </div>
      </div>

      {/* Category Scroller */}
      <div className="category-scroller-container">
        <div className="category-scroller">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="restaurant-cards-container">
        {filteredRestaurants.length > 0 ? (
          <div className="restaurant-cards-grid">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                image={restaurant.image}
                title={restaurant.title}
                description={restaurant.description}
              />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No shops found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurant;
