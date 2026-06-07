import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from '../../components/user/CartItem';
import './Cart.css';

const Cart = () => {
  const { cartItems, getCartTotal, deliveryFee, convenienceFee, platformSettingsLoading, platformSettings } = useCart();

  const subtotal = getCartTotal();
  const resolvedDeliveryFee = deliveryFee ?? 0;
  const resolvedConvenienceFee = convenienceFee ?? 0;
  const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;
  const minimumOrderAmount = Number(platformSettings?.min_order_amount) || 0;
  const amountToMinimum = Math.max(0, minimumOrderAmount - subtotal);
  const isBelowMinimumOrder = subtotal < minimumOrderAmount;

  const freeDeliveryRule = platformSettings?.delivery_rules?.find(rule => Number(rule.fee) === 0);
  const freeDeliveryThreshold = freeDeliveryRule ? Number(freeDeliveryRule.min) : null;
  const isFreeDeliveryEligible = freeDeliveryThreshold !== null;
  const amountToFreeDelivery = isFreeDeliveryEligible ? Math.max(0, freeDeliveryThreshold - subtotal) : 0;
  const hasFreeDelivery = isFreeDeliveryEligible && amountToFreeDelivery === 0;

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
                  <CartItem key={item.clientItemId || item.item_id || item.id} item={item} showControls={true} compact={false} />
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
              {isFreeDeliveryEligible && (
                <div className="summary-row free-delivery-note" style={{ fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '0.5rem', borderBottom: 'none' }}>
                  {hasFreeDelivery ? (
                    <span style={{ color: '#28a745', fontWeight: '500', width: '100%', textAlign: 'left' }}>Free delivery unlocked!</span>
                  ) : (
                    <span style={{ color: '#dc3545', fontWeight: '500', width: '100%', textAlign: 'left' }}>Add ₹{amountToFreeDelivery.toFixed(0)} more for free delivery</span>
                  )}
                </div>
              )}
              <div className="summary-row">
                <span>Convenience Fee</span>
                <span>{platformSettingsLoading && convenienceFee === null ? 'Loading...' : `₹${resolvedConvenienceFee.toFixed(2)}`}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              {isBelowMinimumOrder && (
                <div className="summary-row minimum-order-note">
                  <span>Minimum order</span>
                  <span>₹{minimumOrderAmount.toFixed(0)} (add ₹{amountToMinimum.toFixed(0)} more)</span>
                </div>
              )}
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
