import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import GroceryItemCard from './itemcard';
import './subcategoryitem.css';

const SubCategoryItem = () => {
  const { shopId, categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const categoryName = location.state?.categoryName || 'Items';

  // Dummy subcategories data
  const subcategories = [
    { id: 1, name: 'RICE', icon: '🌾', count: 8 },
    { id: 2, name: 'ATTA', icon: '🌾', count: 12 },
    { id: 3, name: 'DALS', icon: '🫘', count: 10 },
    { id: 4, name: 'OIL', icon: '🫗', count: 15 },
    { id: 5, name: 'TEA', icon: '☕', count: 8 },
    { id: 6, name: 'COFFEE', icon: '☕', count: 6 },
    { id: 7, name: 'BISCUITS', icon: '🍪', count: 20 },
    { id: 8, name: 'SNACKS', icon: '🍿', count: 18 },
    { id: 9, name: 'SPICES', icon: '🌶️', count: 15 }
  ];

  // Dummy grocery items
  const groceryItems = [
    { id: 1, name: 'Tata Tea Gold', price: 285, weight: '1 kg', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=200' },
    { id: 2, name: 'Red Label Tea', price: 250, weight: '1 kg', image: 'https://images.unsplash.com/photo-1597318120209-a1cd903920a5?w=200' },
    { id: 3, name: 'Brooke Bond Tea', price: 240, weight: '1 kg', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200' },
    { id: 4, name: 'Lipton Green Tea', price: 320, weight: '500 g', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200' },
    { id: 5, name: 'Taj Mahal Tea', price: 295, weight: '1 kg', image: 'https://images.unsplash.com/photo-1597318120209-a1cd903920a5?w=200' },
    { id: 6, name: 'Society Tea', price: 275, weight: '1 kg', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=200' },
    { id: 7, name: 'Wagh Bakri Tea', price: 260, weight: '1 kg', image: 'https://images.unsplash.com/photo-1597318120209-a1cd903920a5?w=200' },
    { id: 8, name: 'Organic India Tea', price: 350, weight: '500 g', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200' }
  ];

  const [selectedSubcategory, setSelectedSubcategory] = React.useState(subcategories[4]);

  return (
    <div className="subcategory-item-page">
      {/* Header */}
      <div className="subcategory-item-header">
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
      <div className="subcategory-item-content">
        {/* Sidebar with subcategories */}
        <div className="subcategory-item-sidebar">
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
            {groceryItems.map((item) => (
              <GroceryItemCard
                key={item.id}
                name={item.name}
                price={item.price}
                weight={item.weight}
                image={item.image}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubCategoryItem;