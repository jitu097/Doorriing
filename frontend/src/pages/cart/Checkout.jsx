import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { orderService } from '../../services/order.service.js';
import AddressForm from '../../components/common/AddressForm';
import './Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const { cartItems, getCartTotal, clearCart } = useCart();
    const { addresses, addAddress, updateAddress, isLoading: addressLoading } = useAddress();
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('COD');

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [addressFormData, setAddressFormData] = useState({
        type: 'Home',
        name: '',
        phone: '',
        building: '',
        area: '',
        landmark: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false
    });

    const subtotal = getCartTotal();
    const deliveryFee = 20;
    const grandTotal = subtotal + deliveryFee;

    // Auto-select logic
    useEffect(() => {
        if (addresses && addresses.length > 0 && !selectedAddressId) {
            const defaultAddress = addresses.find(a => a.isDefault);
            if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id);
            } else {
                setSelectedAddressId(addresses[0].id);
            }
        }
    }, [addresses, selectedAddressId]);

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!selectedAddressId) {
            setErrorMsg('Please select a delivery address');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        try {
            setLoading(true);
            const response = await orderService.checkout({
                addressId: selectedAddressId,
                paymentMethod: paymentMethod
            });

            await clearCart();
            
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

    const handleAddNewAddress = () => {
        setEditingAddress(null);
        setAddressFormData({
            type: 'Home', name: '', phone: '', building: '', area: '', 
            landmark: '', city: 'Latehar', state: 'Jharkhand', postalCode: '829206', isDefault: false
        });
        setShowAddressModal(true);
    };

    const handleEditAddress = (e, addr) => {
        e.stopPropagation();
        setEditingAddress(addr.id);
        setAddressFormData(addr);
        setShowAddressModal(true);
    };

    const handleAddressSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAddress) {
                await updateAddress(editingAddress, addressFormData);
            } else {
                const newAddr = await addAddress(addressFormData);
                if (newAddr && newAddr.id) {
                    setSelectedAddressId(newAddr.id);
                }
            }
            setShowAddressModal(false);
        } catch (err) {
            alert(err.message || 'Error saving address');
        }
    };

    if (cartItems.length === 0) {
        navigate('/home');
        return null;
    }

    const getAddressIcon = (type) => {
        const icons = { 'Home': '🏠', 'Work': '💼', 'Other': '📍' };
        return icons[type] || '📍';
    };

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <h1 className="checkout-title">Checkout</h1>

                <form className="checkout-form" onSubmit={handlePlaceOrder}>
                    {errorMsg && <div className="error-message" style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>{errorMsg}</div>}
                    
                    <div className="checkout-sections">
                        {/* Left Section: Address & Payment */}
                        <div className="checkout-main">
                            
                            {/* Delivery Address Selection */}
                            <div className="checkout-section">
                                <h2 className="section-heading">Delivery Address</h2>
                                
                                {addressLoading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading addresses...</div>
                                ) : (
                                    <div className="address-grid-horizontal">
                                        {addresses.map(addr => (
                                            <div 
                                                key={addr.id} 
                                                className={`checkout-address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedAddressId(addr.id)}
                                            >
                                                <div className="address-main-info">
                                                    <input 
                                                        type="radio" 
                                                        className="address-radio"
                                                        checked={selectedAddressId === addr.id}
                                                        onChange={() => setSelectedAddressId(addr.id)}
                                                    />
                                                    <div className="address-details-text">
                                                        <div className="address-header-row">
                                                            <span className={`address-type-badge ${addr.isDefault ? 'default' : ''}`}>
                                                                {getAddressIcon(addr.type)} {addr.type} {addr.isDefault && '(Default)'}
                                                            </span>
                                                        </div>
                                                        <span className="address-name">{addr.name}</span>
                                                        <span className="address-line">{addr.building}, {addr.area}</span>
                                                        <span className="address-line">{addr.city}, {addr.state} - {addr.postalCode}</span>
                                                        <span className="address-phone">📞 {addr.phone}</span>
                                                    </div>
                                                </div>
                                                <button type="button" className="address-edit-btn" onClick={(e) => handleEditAddress(e, addr)}>
                                                    Edit
                                                </button>
                                            </div>
                                        ))}

                                        <button type="button" className="add-new-address-btn" onClick={handleAddNewAddress}>
                                            <span style={{ fontSize: '18px' }}>+</span> Add New Address
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Selection */}
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

                                <button type="submit" className="place-order-btn" disabled={loading || !selectedAddressId}>
                                    {loading ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Address Form Modal */}
            {showAddressModal && (
                <AddressForm
                    formData={addressFormData}
                    setFormData={setAddressFormData}
                    onSubmit={handleAddressSubmit}
                    onCancel={() => setShowAddressModal(false)}
                    isEditing={!!editingAddress}
                />
            )}
        </div>
    );
};

export default Checkout;
