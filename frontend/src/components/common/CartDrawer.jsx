import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from '../user/CartItem';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, deliveryFee, convenienceFee, platformSettingsLoading } = useCart();
  const [billDetailsOpen, setBillDetailsOpen] = useState(false);

  const subtotal = getCartTotal();
  const resolvedDeliveryFee = deliveryFee ?? 0;
  const resolvedConvenienceFee = convenienceFee ?? 0;
  const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      onClose();
      navigate('/checkout/payment');
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
          <button className="cart-drawer-back" onClick={onClose} aria-label="Go back">
            <span style={{fontSize: '1.6rem', fontWeight: 600, lineHeight: 1}}>&larr;</span>
          </button>
          <button className="cart-drawer-close" onClick={onClose} aria-label="Close cart">
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
                {!billDetailsOpen && (
                  <div className="summary-collapsed">
                    <div 
                      className="summary-header" 
                      onClick={() => setBillDetailsOpen(!billDetailsOpen)}
                    >
                      <div className={`summary-arrow ${billDetailsOpen ? 'open' : ''}`}>
                        ▶
                      </div>
                    </div>
                    <div className="summary-row grand-total" onClick={() => setBillDetailsOpen(!billDetailsOpen)}>
                      <span>Total Amount</span>
                      <span className="grand-total-value">₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>
                )}

                {billDetailsOpen && (
                  <div className="bill-details-content">
                    <h4>Bill Summary</h4>
                    <div 
                    
                      className="summary-header" 
                      onClick={() => setBillDetailsOpen(!billDetailsOpen)}
                    >
                      <div className={`summary-arrow ${billDetailsOpen ? 'open' : ''}`}>
                        ▶
                      </div>
                    </div>
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
                      <span className="summary-value">{platformSettingsLoading && deliveryFee === null ? 'Loading...' : `₹${resolvedDeliveryFee}`}</span>
                    </div>

                    <div className="summary-row">
                      <span className="summary-icon">🧾</span>
                      <span>Convenience fee</span>
                      <span className="summary-value">{platformSettingsLoading && convenienceFee === null ? 'Loading...' : `₹${resolvedConvenienceFee}`}</span>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="summary-row grand-total">
                      <span>Grand total</span>
                      <span className="grand-total-value">₹{grandTotal.toFixed(0)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="cart-drawer-footer">
                <button className="checkout-button" onClick={handleCheckout}>
                  Proceed to Checkout
                </button>
                <div className="cancellation-policy-box">
                  <div className="cancellation-policy-title">Cancellation Policy</div>
                  <div className="cancellation-policy-text">
                    Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
