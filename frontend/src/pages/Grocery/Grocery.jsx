import React, { useState } from 'react';
import './Grocery.css';
import ShopCard from '../shopcard/shopcard';

const Grocery = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Categories
  const categories = [
    'All',
    'Hotels',
    'Restaurant',
    'Sweet Store',
    'Dhaba',
    'Fast Food',
    'Cafe',
    'Bakery',
    'Others'
  ];

  // Dummy data for shop cards
  const dummyShops = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
      title: 'Govind General Store',
      description: 'Serving items across 15 categories',
      category: 'Hotels'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400',
      title: 'Fresh Market',
      description: 'Serving items across 20 categories',
      category: 'Restaurant'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400',
      title: 'Daily Needs Store',
      description: 'Serving items across 18 categories',
      category: 'Cafe'
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
      title: 'Organic Store',
      description: 'Serving items across 12 categories',
      category: 'Fast Food'
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      title: 'Sweet Paradise',
      description: 'Serving items across 10 categories',
      category: 'Sweet Store'
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
      title: 'Dhaba Delight',
      description: 'Serving items across 14 categories',
      category: 'Dhaba'
    }
  ];

  // Filter shops based on selected category
  const filteredShops = selectedCategory === 'All'
    ? dummyShops
    : dummyShops.filter(shop => shop.category === selectedCategory);

  return (
    <div>
      <div className="grocery-curve-bg">
        <div className="grocery-content">
          <h2>Grocery Section</h2>
          <p>All your daily needs in one place!</p>
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
      
      <div className="grocery-shops-container">
        {filteredShops.length > 0 ? (
          <div className="grocery-shops-grid">
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                id={shop.id}
                image={shop.image}
                title={shop.title}
                description={shop.description}
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

export default Grocery;
