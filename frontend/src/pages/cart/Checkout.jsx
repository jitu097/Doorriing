import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import AddressForm from '../../components/common/AddressForm';
import './Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems, getCartTotal, deliveryFee, convenienceFee, platformSettings, platformSettingsLoading } = useCart();
    const { addresses, addAddress, updateAddress, isLoading: addressLoading } = useAddress();
    
    const [errorMsg, setErrorMsg] = useState(null);
    const initialSelectedAddressId = location.state?.selectedAddressId || sessionStorage.getItem('checkoutSelectedAddressId');
    const [selectedAddressId, setSelectedAddressId] = useState(initialSelectedAddressId ? String(initialSelectedAddressId) : null);

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
    const resolvedDeliveryFee = deliveryFee ?? 0;
    const resolvedConvenienceFee = convenienceFee ?? 0;
    const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;
    const freeDeliveryThreshold = Array.isArray(platformSettings?.delivery_rules)
        ? platformSettings.delivery_rules
            .filter(rule => Number(rule.fee) === 0)
            .sort((a, b) => Number(a.min) - Number(b.min))[0]?.min
        : null;
    const amountForFreeDelivery = freeDeliveryThreshold && subtotal < freeDeliveryThreshold
        ? freeDeliveryThreshold - subtotal
        : 0;

    // Auto-select logic
    useEffect(() => {
        if (addresses && addresses.length > 0 && !selectedAddressId) {
            const defaultAddress = addresses.find(a => a.isDefault);
            if (defaultAddress) {
                setSelectedAddressId(String(defaultAddress.id));
            } else {
                setSelectedAddressId(String(addresses[0].id));
            }
        }
    }, [addresses, selectedAddressId]);

    useEffect(() => {
        if (selectedAddressId) {
            sessionStorage.setItem('checkoutSelectedAddressId', String(selectedAddressId));
        }
    }, [selectedAddressId]);

    const handleContinueToPayment = (e) => {
        e.preventDefault();
        if (!selectedAddressId) {
            setErrorMsg('Please select a delivery address before continuing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setErrorMsg(null);
        sessionStorage.setItem('checkoutSelectedAddressId', selectedAddressId);
        navigate('/checkout/payment', { state: { selectedAddressId } });
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
        // Ensure all fields have at least empty strings to avoid uncontrolled input warnings
        setAddressFormData({
            ...addr,
            landmark: addr.landmark || '',
            name: addr.name || '',
            phone: addr.phone || '',
            building: addr.building || '',
            area: addr.area || ''
        });
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
                <div className="checkout-title-row">
                    <h1 className="checkout-title">Checkout</h1>
                    <span className="checkout-step-indicator">Step 1 of 2</span>
                </div>

                <form className="checkout-form" onSubmit={handleContinueToPayment}>
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
                                        {Array.from(new Set(addresses.map(a => a.id))).map(id => {
                                            const addr = addresses.find(a => a.id === id);
                                            const normalizedId = String(addr.id);
                                            const isSelected = selectedAddressId && String(selectedAddressId) === normalizedId;
                                            const primaryLine = [addr.building, addr.area, addr.landmark]
                                                .filter(Boolean)
                                                .join(', ');
                                            const secondaryParts = [addr.city, addr.state]
                                                .filter(Boolean)
                                                .join(', ');
                                            const secondaryLine = addr.postalCode
                                                ? `${secondaryParts}${secondaryParts ? ' - ' : ''}${addr.postalCode}`
                                                : secondaryParts;

                                            return (
                                                <div 
                                                    key={addr.id} 
                                                    className={`checkout-address-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setSelectedAddressId(normalizedId)}
                                                >
                                                    <div className="address-main-info">
                                                        <input 
                                                            type="radio" 
                                                            className="address-radio"
                                                            checked={!!isSelected}
                                                            onChange={() => setSelectedAddressId(normalizedId)}
                                                        />
                                                        <div className="address-details-text">
                                                            <div className="address-header-row">
                                                                <span className={`address-type-badge ${addr.isDefault ? 'default' : ''}`}>
                                                                    {getAddressIcon(addr.type)} {addr.type} {addr.isDefault && '(Default)'}
                                                                </span>
                                                            </div>
                                                            <span className="address-name">{addr.name}</span>
                                                            {primaryLine && (
                                                                <span className="address-line primary">{primaryLine}</span>
                                                            )}
                                                            {secondaryLine && (
                                                                <span className="address-line secondary">{secondaryLine}</span>
                                                            )}
                                                            {addr.phone && (
                                                                <span className="address-phone">📞 {addr.phone}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button type="button" className="address-edit-btn" onClick={(e) => handleEditAddress(e, addr)}>
                                                        Edit
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        <button type="button" className="add-new-address-btn" onClick={handleAddNewAddress}>
                                            <span style={{ fontSize: '18px' }}>+</span> Add New Address
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Selection */}
                            
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
                                    <span>{platformSettingsLoading && deliveryFee === null ? 'Loading...' : `₹${resolvedDeliveryFee.toFixed(2)}`}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Convenience Fee</span>
                                    <span>{platformSettingsLoading && convenienceFee === null ? 'Loading...' : `₹${resolvedConvenienceFee.toFixed(2)}`}</span>
                                </div>

                                {amountForFreeDelivery > 0 && (
                                    <div className="summary-row" style={{ color: '#16a34a', fontSize: '0.9rem' }}>
                                        <span>Add ₹{amountForFreeDelivery.toFixed(2)} more to get free delivery</span>
                                    </div>
                                )}

                                <div className="summary-divider"></div>

                                <div className="summary-row total">
                                    <span>Grand Total</span>
                                    <span>₹{grandTotal.toFixed(2)}</span>
                                </div>

                                <button
                                    type="submit"
                                    className="place-order-btn"
                                    disabled={!selectedAddressId}
                                >
                                    Continue to Payment
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
