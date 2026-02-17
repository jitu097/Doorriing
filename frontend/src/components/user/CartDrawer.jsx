import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from './CartItem';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
    const { cartItems, getCartTotal } = useCart();

    if (!isOpen) return null;

    return (
        <>
            <div className="cart-drawer-overlay" onClick={onClose} />
            <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
                <div className="cart-drawer-header">
                    <h2>Your Cart</h2>
                    <button className="cart-drawer-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="cart-drawer-body">
                    {cartItems.length === 0 ? (
                        <div className="cart-empty-state">
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        <>
                            {cartItems.map((item) => (
                                <CartItem key={item.id} item={item} compact={true} />
                            ))}
                        </>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="cart-drawer-footer">
                        <div className="cart-drawer-total">
                            <span>Total</span>
                            <span className="total-amount">₹{getCartTotal().toFixed(2)}</span>
                        </div>
                        <Link to="/cart" className="cart-drawer-btn" onClick={onClose}>
                            View Cart
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
