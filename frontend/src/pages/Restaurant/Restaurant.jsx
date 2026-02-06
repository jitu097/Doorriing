import React from 'react';
import './Restaurant.css';
import RestaurantCard from '../Restaurantcard/card';

const Restaurant = () => {
  // Dummy data for restaurant cards
  const dummyRestaurants = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
      title: 'The Spice Kitchen',
      description: 'Serving items across 25 categories'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
      title: 'Pizza Paradise',
      description: 'Serving items across 15 categories'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
      title: 'Cafe Delight',
      description: 'Serving items across 18 categories'
    }
  ];

  return (
    <div>
      <div className="restaurant-curve-bg">
        <div className="restaurant-content">
          <h2>Restaurant Section</h2>
          <p>Order delicious food from your favorite restaurants!</p>
        </div>
      </div>
      
      <div className="restaurant-cards-container">
        <div className="restaurant-cards-grid">
          {dummyRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              id={restaurant.id}
              image={restaurant.image}
              title={restaurant.title}
              description={restaurant.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Restaurant;
