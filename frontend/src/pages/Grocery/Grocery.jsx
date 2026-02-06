import React from 'react';
import './Grocery.css';
import ShopCard from '../shopcard/shopcard';

const Grocery = () => {
  // Dummy data for shop cards
  const dummyShops = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
      title: 'Govind General Store',
      description: 'Serving items across 15 categories'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400',
      title: 'Fresh Market',
      description: 'Serving items across 20 categories'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400',
      title: 'Daily Needs Store',
      description: 'Serving items across 18 categories'
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
      title: 'Organic Store',
      description: 'Serving items across 12 categories'
    }
  ];

  return (
    <div>
      <div className="grocery-curve-bg">
        <div className="grocery-content">
          <h2>Grocery Section</h2>
          <p>All your daily needs in one place!</p>
        </div>
      </div>
      
      <div className="grocery-shops-container">
        <div className="grocery-shops-grid">
          {dummyShops.map((shop) => (
            <ShopCard
              key={shop.id}
              id={shop.id}
              image={shop.image}
              title={shop.title}
              description={shop.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Grocery;
