import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from '../user/CartItem';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal } = useCart();

  const subtotal = getCartTotal();
  const deliveryFee = cartItems.length > 0 ? 20 : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      onClose();
      navigate('/checkout');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('cart-drawer-overlay')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={handleOverlayClick}>
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h2>My Cart</h2>
          <button className="cart-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cart-drawer-content">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <div className="empty-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Add items to get started</p>
            </div>
          ) : (
            <>
              <div className="cart-drawer-items">
                {cartItems.map((item) => (
                  <CartItem key={item.id} item={item} showControls={true} compact={true} />
                ))}
              </div>

              <div className="cart-drawer-summary">
                <h3 className="summary-title">Bill details</h3>
                
                <div className="summary-row">
                  <span className="summary-icon">🛍️</span>
                  <span>Items total</span>
                  <span className="summary-value">
                    <span className="strikethrough">₹{(subtotal + 256).toFixed(0)}</span> ₹{subtotal.toFixed(0)}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-icon">🚚</span>
                  <span>Delivery charge</span>
                  <span className="summary-value">FREE</span>
                </div>

                <div className="summary-row">
                  <span className="summary-icon">📦</span>
                  <span>Handling charge</span>
                  <span className="summary-value">₹2</span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row grand-total">
                  <span>Grand total</span>
                  <span className="grand-total-value">₹{(subtotal + 2).toFixed(0)}</span>
                </div>
              </div>

              <div className="cart-drawer-footer">
                <button className="checkout-button" onClick={handleCheckout}>
                  Proceed to Checkout
                </button>
                <div className="cancellation-policy">Cancellation Policy</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
