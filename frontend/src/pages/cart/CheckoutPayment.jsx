import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { orderService } from '../../services/order.service.js';
import './Checkout.css';

const CheckoutPayment = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems, getCartTotal, clearCart } = useCart();
    const { addresses } = useAddress();

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [errorMsg, setErrorMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState(() => {
        const initial = location.state?.selectedAddressId || sessionStorage.getItem('checkoutSelectedAddressId');
        return initial ? String(initial) : null;
    });

    const subtotal = getCartTotal();
    const deliveryFee = 20;
    const handlingCharge = 2;
    const grandTotal = subtotal + deliveryFee + handlingCharge;

    useEffect(() => {
        if (!cartItems || cartItems.length === 0) {
            navigate('/home', { replace: true });
        }
    }, [cartItems, navigate]);

    useEffect(() => {
        if (!selectedAddressId) {
            navigate('/checkout', { replace: true });
        }
    }, [selectedAddressId, navigate]);

    const selectedAddress = useMemo(() => {
        if (!addresses) return null;
        return addresses.find(addr => String(addr.id) === String(selectedAddressId));
    }, [addresses, selectedAddressId]);

    const formatPrimaryLine = (addr) => {
        if (!addr) return '';
        return [addr.building, addr.area, addr.landmark].filter(Boolean).join(', ');
    };

    const formatSecondaryLine = (addr) => {
        if (!addr) return '';
        const secondaryParts = [addr.city, addr.state].filter(Boolean).join(', ');
        return addr.postalCode ? `${secondaryParts}${secondaryParts ? ' - ' : ''}${addr.postalCode}` : secondaryParts;
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!selectedAddressId) {
            setErrorMsg('Missing delivery address. Please go back and select one.');
            return;
        }

        try {
            setLoading(true);
            const response = await orderService.checkout({
                addressId: selectedAddressId,
                paymentMethod,
            });

            await clearCart();
            sessionStorage.removeItem('checkoutSelectedAddressId');

            const orderId = response.data?.order?.id || response.data?.order?.order_number || 'success';
            navigate(`/order-confirmation?orderId=${orderId}`);
        } catch (error) {
            console.error('Checkout failed:', error);
            setErrorMsg(error.message || 'Failed to place order. Please try again.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    const handleBackToAddress = () => {
        navigate('/checkout', { state: { selectedAddressId } });
    };

    if (!cartItems || cartItems.length === 0) {
        return null;
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <div className="checkout-title-row">
                    <h1 className="checkout-title">Checkout</h1>
                    <span className="checkout-step-indicator">Step 2 of 2</span>
                </div>

                <form className="checkout-form" onSubmit={handlePlaceOrder}>
                    {errorMsg && (
                        <div className="error-message" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                            {errorMsg}
                        </div>
                    )}

                    <div className="checkout-sections">
                        <div className="checkout-main">
                            <div className="checkout-section">
                                <div className="section-heading">
                                    <span>Delivery Address</span>
                                    <button type="button" className="address-edit-btn" onClick={handleBackToAddress}>
                                        Change
                                    </button>
                                </div>
                                {!selectedAddress ? (
                                    <div style={{ padding: '15px', color: '#6b7280' }}>Loading address...</div>
                                ) : (
                                    <div className="selected-address-card">
                                        <div className="selected-address-type">
                                            {selectedAddress.type || 'Home'} {selectedAddress.isDefault ? '(Default)' : ''}
                                        </div>
                                        <div className="selected-address-name">{selectedAddress.name}</div>
                                        {formatPrimaryLine(selectedAddress) && (
                                            <div className="selected-address-line">{formatPrimaryLine(selectedAddress)}</div>
                                        )}
                                        {formatSecondaryLine(selectedAddress) && (
                                            <div className="selected-address-line muted">{formatSecondaryLine(selectedAddress)}</div>
                                        )}
                                        {selectedAddress.phone && (
                                            <div className="selected-address-line">📞 {selectedAddress.phone}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="checkout-section">
                                <h2 className="section-heading">Payment Method</h2>
                                <div className="payment-options">
                                    <label className="payment-option">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="COD"
                                            checked={paymentMethod === 'COD'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                                            checked={paymentMethod === 'Card'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        />
                                        <div className="payment-info">
                                            <strong>Card Payment</strong>
                                            <span>Credit / Debit Card (Demo)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="checkout-section">
                                <button type="submit" className="place-order-btn" disabled={loading || !selectedAddressId}>
                                    {loading ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>
                        </div>

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
                                <div className="summary-row">
                                    <span>Handling Charge</span>
                                    <span>₹{handlingCharge.toFixed(2)}</span>
                                </div>

                                <div className="summary-divider"></div>

                                <div className="summary-row total">
                                    <span>Grand Total</span>
                                    <span>₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutPayment;
