import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import { getShopsByBusinessType } from '../../services/shop.service.js';
import './Footer.css';

const noop = () => {};

const Footer = ({ visible = true, onCartClick = noop }) => {
  const navigate = useNavigate();

  // Prefetch restaurant route chunk and data on hover/touch to speed navigation
  const prefetchRestaurant = () => {
    // warm up the JS chunk
    import('../../pages/Restaurant/Restaurant')
      .then(() => {})
      .catch(() => {});

    // warm up restaurant listing data (fire-and-forget)
    try {
      getShopsByBusinessType('restaurant', { limit: 30 }).catch(() => {});
    } catch (e) {
      // ignore
    }
  };
  // Prefetch grocery route chunk and data similarly
  const prefetchGrocery = () => {
    import('../../pages/Grocery/Grocery')
      .then(() => {})
      .catch(() => {});

    try {
      getShopsByBusinessType('grocery', { limit: 30 }).catch(() => {});
    } catch (e) {
      // ignore
    }
  };
  return (
    <footer className={`mobile-footer${visible ? ' visible' : ' hidden'}`}>
      <nav className="mobile-footer-nav">
        <button className="footer-btn" onClick={() => navigate('/home')}>
          <img src="/home.webp" alt="Home" className="footer-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/grocery/browse')}
          onMouseEnter={() => prefetchGrocery()}
          onTouchStart={() => prefetchGrocery()}
          onFocus={() => prefetchGrocery()}
        >
          <img src="/stores.webp" alt="Groceries" className="footer-icon footer-destination-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/restaurant/browse')}
          onMouseEnter={() => prefetchRestaurant()}
          onTouchStart={() => prefetchRestaurant()}
          onFocus={() => prefetchRestaurant()}
        >
          <img src="/resto.webp" alt="Restaurants" className="footer-icon footer-destination-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/orders')}>
          <img src="/order.webp" alt="Orders" className="footer-icon" />
        </button>
       
        <div className="footer-notification-item">
          <NotificationBell />
        </div>
        
      </nav>
    </footer>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(Footer);
