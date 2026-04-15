import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from '../../components/user/CartItem';
import './Cart.css';

const Cart = () => {
  const { cartItems, getCartTotal, deliveryFee, convenienceFee, platformSettingsLoading } = useCart();

  const subtotal = getCartTotal();
  const resolvedDeliveryFee = deliveryFee ?? 0;
  const resolvedConvenienceFee = convenienceFee ?? 0;
  const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1 className="cart-title">Your Cart</h1>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add items to get started</p>
            <Link to="/home" className="continue-shopping-link">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items-section">
              <h2 className="section-title">Items ({cartItems.length})</h2>
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <CartItem key={item.id} item={item} showControls={true} compact={false} />
                ))}
              </div>
            </div>

            <div className="cart-summary">
              <h2 className="section-title">Price Summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{platformSettingsLoading && deliveryFee === null ? 'Loading...' : `₹${resolvedDeliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="summary-row">
                <span>Convenience Fee</span>
                <span>{platformSettingsLoading && convenienceFee === null ? 'Loading...' : `₹${resolvedConvenienceFee.toFixed(2)}`}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <Link to="/home" className="continue-link">
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
