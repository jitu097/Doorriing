import React, { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('orderId') || 'N/A';

    // Redirect if no orderId
    useEffect(() => {
        if (!searchParams.get('orderId')) {
            navigate('/cart');
        }
    }, [searchParams, navigate]);

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
                        <span className="info-value">10-15 minutes</span>
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
