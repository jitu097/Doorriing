import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="mobile-footer">
      <nav className="mobile-footer-nav">
        <button className="footer-btn" onClick={() => navigate('/home')}>
          <img src="/home.webp" alt="Home" className="footer-icon" />
          <span>Home</span>
        </button>
        <button className="footer-btn" onClick={() => navigate('/orders')}>
          <img src="/order.webp" alt="Orders" className="footer-icon" />
          <span>Orders</span>
        </button>
        <button className="footer-btn" onClick={() => navigate('/shops')}>
          <img src="/categories.webp" alt="Categories" className="footer-icon" />
          <span>Categories</span>
        </button>
        <button className="footer-btn" onClick={() => navigate('/profile')}>
          <img src="/profile.webp" alt="Profile" className="footer-icon" />
          <span>Profile</span>
        </button>
      </nav>
    </footer>
  );
};

export default Footer;
