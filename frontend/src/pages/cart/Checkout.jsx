import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { orderService } from '../../services/order.service.js';
import './Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, getCartTotal, clearCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [formData, setFormData] = useState({
        name: user.name || '',
        phone: user.phone || '',
        addressType: 'Home',
        building: '',
        floor: '',
        area: '',
        landmark: '',
        paymentMethod: 'COD'
    });

    const subtotal = getCartTotal();
    const deliveryFee = 20;
    const grandTotal = subtotal + deliveryFee;

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setErrorMsg(null);

        // Validation
        if (!formData.name || !formData.phone || !formData.building || !formData.area) {
            setErrorMsg('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const response = await orderService.checkout(formData);

            // Clear cart Context natively
            await clearCart();

            const orderId = response.data?.order?.id || response.data?.order?.order_number || 'success';

            // Navigate to confirmation page
            navigate(`/order-confirmation?orderId=${orderId}`);
        } catch (error) {
            console.error('Checkout failed:', error);
            setErrorMsg(error.message || 'Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        navigate('/home');
        return null;
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <h1 className="checkout-title">Checkout</h1>

                <form className="checkout-form" onSubmit={handlePlaceOrder}>
                    {errorMsg && <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{errorMsg}</div>}
                    <div className="checkout-sections">
                        {/* Left Section: Address & Payment */}
                        <div className="checkout-main">
                            {/* Delivery Address */}
                            <div className="checkout-section">
                                <h2 className="section-heading">Delivery Address</h2>

                                <div className="address-type-selector">
                                    {['Home', 'Work', 'Hotel', 'Other'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`address-type-btn ${formData.addressType === type ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, addressType: type })}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="form-grid">
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Your Name *"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number *"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                    <input
                                        type="text"
                                        name="building"
                                        placeholder="Flat / House no / Building *"
                                        value={formData.building}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input full-width"
                                    />
                                    <input
                                        type="text"
                                        name="floor"
                                        placeholder="Floor (optional)"
                                        value={formData.floor}
                                        onChange={handleInputChange}
                                        className="form-input"
                                    />
                                    <input
                                        type="text"
                                        name="area"
                                        placeholder="Area / Sector / Locality *"
                                        value={formData.area}
                                        onChange={handleInputChange}
                                        required
                                        className="form-input"
                                    />
                                    <input
                                        type="text"
                                        name="landmark"
                                        placeholder="Nearby Landmark (optional)"
                                        value={formData.landmark}
                                        onChange={handleInputChange}
                                        className="form-input full-width"
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="checkout-section">
                                <h2 className="section-heading">Payment Method</h2>

                                <div className="payment-options">
                                    <label className="payment-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={formData.paymentMethod === 'COD'}
                                            onChange={handleInputChange}
                                        />
                                        <div className="payment-info">
                                            <strong>Cash on Delivery</strong>
                                            <span>Pay when you receive</span>
                                        </div>
                                    </label>

                                    <label className="payment-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="Card"
                                            checked={formData.paymentMethod === 'Card'}
                                            onChange={handleInputChange}
                                        />
                                        <div className="payment-info">
                                            <strong>Card Payment</strong>
                                            <span>Credit / Debit Card (Demo)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Order Summary */}
                        <div className="checkout-sidebar">
                            <div className="order-summary">
                                <h2 className="section-heading">Order Summary</h2>

                                <div className="summary-items">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="summary-item">
                                            <div className="summary-item-info">
                                                <span className="summary-item-name">{item.name}</span>
                                                <span className="summary-item-qty">x{item.quantity}</span>
                                            </div>
                                            <span className="summary-item-price">
                                                ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="summary-divider"></div>

                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Delivery Fee</span>
                                    <span>₹{deliveryFee.toFixed(2)}</span>
                                </div>

                                <div className="summary-divider"></div>

                                <div className="summary-row total">
                                    <span>Grand Total</span>
                                    <span>₹{grandTotal.toFixed(2)}</span>
                                </div>

                                <button type="submit" className="place-order-btn" disabled={loading}>
                                    {loading ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Checkout;
