import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('orderId') || 'N/A';
    const [eta, setEta] = useState('10-15 minutes');

    // Redirect if no orderId and fetch order to compute ETA
    useEffect(() => {
        if (!searchParams.get('orderId')) {
            navigate('/home');
            return;
        }

        let mounted = true;
        (async () => {
            try {
                const resp = await orderService.getOrderById(orderId);
                const order = resp?.data || {};
                const shop = order.shops || order.shop || {};
                const shopName = (shop.name || order.shop_name || '').toString().toLowerCase();
                const candidates = [shop.type, shop.business_type, shop.category, order.shop_type].filter(Boolean).map(s => String(s).toLowerCase());
                const isGrocery = candidates.some(s => s.includes('grocery') || s.includes('mart') || s.includes('super')) || shopName.includes('grocery') || shopName.includes('mart') || shopName.includes('store');
                const isRestaurant = candidates.some(s => s.includes('rest') || s.includes('restaurant') || s.includes('food')) || shopName.includes('biryani') || shopName.includes('restaurant') || shopName.includes('dhaba') || shopName.includes('cafe');
                const etaValue = isRestaurant ? '45 – 60 minutes' : isGrocery ? '20 – 30 minutes' : '20-40 minutes';
                if (mounted) setEta(etaValue);
            } catch (err) {
                // keep default
            }
        })();

        return () => { mounted = false; };
    }, [searchParams, navigate, orderId]);

    return (
        <div className="order-success-page">
            <div className="success-container">
                <div className="success-icon">
                    <svg viewBox="0 0 100 100" className="checkmark">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#0c831f" strokeWidth="4" />
                        <path
                            fill="none"
                            stroke="#0c831f"
                            strokeWidth="5"
                            d="M30 50 L45 65 L70 35"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <h1 className="success-title">Order Placed Successfully!</h1>
                <p className="success-message">Thank you for your order. We're preparing it now.</p>

                <div className="order-info">
                    <div className="info-row">
                        <span className="info-label">Order ID:</span>
                        <span className="info-value">{orderId}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Estimated Delivery:</span>
                        <span className="info-value">{eta}</span>
                    </div>
                </div>

                <div className="success-actions">
                    <Link to="/orders" className="btn btn-primary">
                        View Orders
                    </Link>
                    <Link to="/home" className="btn btn-secondary">
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
