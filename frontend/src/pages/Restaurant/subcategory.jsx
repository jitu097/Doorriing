import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ItemCard from './itemcard';
import './subcategory.css';

const SubCategory = () => {
  const { restaurantId, categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryName = location.state?.categoryName || 'Menu Items';

  // Dummy subcategories data
  const subcategories = [
    { id: 1, name: 'THALI', icon: '🍛', count: 8 },
    { id: 2, name: 'INDIAN BREADS', icon: '🫓', count: 12 },
    { id: 3, name: 'RICE', icon: '🍚', count: 6 },
    { id: 4, name: 'CHINESE', icon: '🥘', count: 15 },
    { id: 5, name: 'DAL', icon: '🥣', count: 5 },
    { id: 6, name: 'SALAD', icon: '🥗', count: 4 },
    { id: 7, name: 'SOUP', icon: '🍲', count: 10 },
    { id: 8, name: 'MAIN COURSE', icon: '🍳', count: 20 },
    { id: 9, name: 'STARTER', icon: '🥙', count: 18 }
  ];

  // Dummy food items
  const foodItems = [
    { id: 1, name: 'VEG SOUP', price: 184, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200' },
    { id: 2, name: 'VEG SWEET CORN SOUP', price: 196, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=200' },
    { id: 3, name: 'VEG HOT & SOUR SOUP', price: 196, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=200' },
    { id: 4, name: 'VEG MANCHOW SOUP', price: 196, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1588566565463-180a5b2090d2?w=200' },
    { id: 5, name: 'VEG CLEAR SOUP', price: 184, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200' },
    { id: 6, name: 'VEG LUNG FUNG SOUP', price: 196, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200' },
    { id: 7, name: 'VEG TOMATO SOUP', price: 174, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200' },
    { id: 8, name: 'VEG LEMON CORIANDER SOUP', price: 184, isVeg: true, isAvailable: true, image: 'https://images.unsplash.com/photo-1604908815604-6e91b1e6c93b?w=200' }
  ];

  const [selectedSubcategory, setSelectedSubcategory] = React.useState(subcategories[6]);

  return (
    <div className="subcategory-page">
      {/* Header */}
      <div className="subcategory-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="header-info">
          <div className="category-icon-header">{selectedSubcategory.icon}</div>
          <div>
            <h1 className="category-title">{selectedSubcategory.name}</h1>
            <p className="category-subtitle">Multiple items</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="subcategory-content">
        {/* Sidebar with subcategories */}
        <div className="subcategory-sidebar">
          {subcategories.map((subcat) => (
            <div
              key={subcat.id}
              className={`subcategory-item ${selectedSubcategory.id === subcat.id ? 'active' : ''}`}
              onClick={() => setSelectedSubcategory(subcat)}
            >
              <div className="subcategory-icon">{subcat.icon}</div>
              <div className="subcategory-name">{subcat.name}</div>
            </div>
          ))}
        </div>

        {/* Items Grid */}
        <div className="items-container">
          <div className="items-grid">
            {foodItems.map((item) => (
              <ItemCard
                key={item.id}
                name={item.name}
                price={item.price}
                isVeg={item.isVeg}
                isAvailable={item.isAvailable}
                image={item.image}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubCategory;