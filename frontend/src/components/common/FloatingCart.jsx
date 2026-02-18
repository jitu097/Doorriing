import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './FloatingCart.css';

const FloatingCart = () => {
  const navigate = useNavigate();
  const { getCartCount, getCartTotal } = useCart();

  const itemCount = getCartCount();
  const totalPrice = getCartTotal();

  // Don't render if cart is empty
  if (itemCount === 0) {
    return null;
  }

  const handleViewCart = () => {
    navigate('/cart');
  };

  return (
    <div className="floating-cart">
      <div className="floating-cart-content">
        <div className="floating-cart-info">
          <div className="cart-icon-wrapper">
            <img 
              src="/shoppingbag.png" 
              alt="Cart" 
              className="cart-icon"
            />
          </div>
          <div className="cart-details">
            <span className="cart-item-count">
              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
            </span>
            <span className="cart-total">₹ {totalPrice.toFixed(0)}</span>
          </div>
        </div>
        <button className="view-cart-btn" onClick={handleViewCart}>
          View Cart
          <svg 
            className="arrow-icon" 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M6 12L10 8L6 4" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FloatingCart;
