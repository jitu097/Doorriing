import React from 'react';
import { useCart } from '../../context/CartContext';
import './CartItem.css';

const CartItem = ({ item, showControls = true, compact = false }) => {
    const { increaseQty, decreaseQty, removeFromCart } = useCart();

    const itemTotal = (parseFloat(item.price) * item.quantity).toFixed(2);

    return (
        <div className={`cart-item ${compact ? 'compact' : ''}`}>
            {item.image && (
                <div className="cart-item-image">
                    <img src={item.image} alt={item.name} />
                </div>
            )}

            <div className="cart-item-details">
                <h4 className="cart-item-name">{item.name}</h4>
                {item.subtitle && <p className="cart-item-subtitle">{item.subtitle}</p>}
                {item.description && !compact && (
                    <p className="cart-item-description">{item.description}</p>
                )}
                <div className="cart-item-price">₹{parseFloat(item.price).toFixed(2)}</div>
            </div>

            {showControls && (
                <div className="cart-item-controls">
                    <div className="quantity-controls">
                        <button
                            className="qty-btn"
                            onClick={() => decreaseQty(item.id)}
                            aria-label="Decrease quantity"
                        >
                            -
                        </button>
                        <span className="qty-display">{item.quantity}</span>
                        <button
                            className="qty-btn"
                            onClick={() => increaseQty(item.id)}
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>
                    {!compact && (
                        <div className="cart-item-total">₹{itemTotal}</div>
                    )}
                </div>
            )}

            {!compact && (
                <button
                    className="cart-item-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default CartItem;
