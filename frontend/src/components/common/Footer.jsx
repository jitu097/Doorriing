import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

const Footer = ({ visible = true }) => {
  const navigate = useNavigate();
  return (
    <footer className={`mobile-footer${visible ? ' visible' : ' hidden'}`}>
      <nav className="mobile-footer-nav">
        <button className="footer-btn" onClick={() => navigate('/home')}>
          <img src="/home.webp" alt="Home" className="footer-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/orders')}>
          <img src="/order.webp" alt="Orders" className="footer-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/shops')}>
          <img src="/apps.webp" alt="Categories" className="footer-icon" />
        </button>
        <button className="footer-btn" onClick={() => navigate('/FloatingCart')}>
          <img src="/carty.webp" alt="Profile" className="footer-icon" />
        </button>
      </nav>
    </footer>
  );
};

export default Footer;
