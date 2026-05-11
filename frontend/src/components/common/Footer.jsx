import React from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import './Footer.css';

const noop = () => {};

const Footer = ({ visible = true, onCartClick = noop }) => {
  const navigate = useNavigate();
  return (
    <footer className={`mobile-footer${visible ? ' visible' : ' hidden'}`}>
      <nav className="mobile-footer-nav">
        <button className="footer-btn" onClick={() => navigate('/home')}>
          <img src="/home.webp" alt="Home" className="footer-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/grocery/browse')}>
          <img src="/stores.png" alt="Groceries" className="footer-icon footer-destination-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/restaurant/browse')}>
          <img src="/resto.png" alt="Restaurants" className="footer-icon footer-destination-icon" />
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
