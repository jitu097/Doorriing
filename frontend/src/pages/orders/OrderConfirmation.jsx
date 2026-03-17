import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('orderId');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [remainingTime, setRemainingTime] = useState(null);

    useEffect(() => {
        if (!orderId) {
            navigate('/home');
            return;
        }

        let intervalId;
        let pollId;

        const fetchOrder = async (showLoading = true) => {
            try {
                if (showLoading) setLoading(true);
                const response = await orderService.getOrderById(orderId);
                const o = response.data;
                setOrder(o);
                if (o) {
                    setRemainingTime(o.remaining_time ?? null);
                }
            } catch (err) {
                console.error('Failed to load order confirmation:', err);
                setErrorMsg('Could not load order details.');
            } finally {
                if (showLoading) setLoading(false);
            }
        };

        fetchOrder(true);
        // Poll every 3 seconds
        pollId = setInterval(() => fetchOrder(false), 3000);
        // Countdown timer
        intervalId = setInterval(() => {
            setRemainingTime(prev => {
                if (prev === null) return null;
                if (prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(pollId);
            clearInterval(intervalId);
        };
    }, [orderId, navigate]);

    const formatTimer = (seconds) => {
        if (seconds === null) return '--:--';
        const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
        const ss = String(seconds % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    };

    if (loading) {
        return (
            <div className="order-confirmation-page">
                <div className="confirmation-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your order confirmation...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !order) {
        return (
            <div className="order-confirmation-page">
                <div className="confirmation-container error">
                    <h2>Oops!</h2>
                    <p>{errorMsg || 'Order not found'}</p>
                    <Link to="/home" className="btn btn-primary">Return Home</Link>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusLabel(order.status);
    const itemsList = order.order_items || [];

    return (
        <div className="order-confirmation-page">
            <div className="confirmation-container">
                <div className="success-icon">
                    <svg viewBox="0 0 100 100" className="checkmark">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#0c831f" strokeWidth="4" />
                        <path fill="none" stroke="#0c831f" strokeWidth="5" d="M30 50 L45 65 L70 35" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <h1 className="success-title">Order Placed Successfully!</h1>

                <div className={`status-alert ${statusInfo.colorClass}`}>
                    <strong>Status: {statusInfo.label}</strong>
                    <p>{statusInfo.message}</p>
                </div>

                {order.status === 'pending' && (
                    <div className="order-timer-section" style={{ 
                        margin: '20px 0', 
                        padding: '15px', 
                        background: '#fff9e6', 
                        border: '1px solid #ffeeba', 
                        borderRadius: '8px',
                        textAlign: 'center' 
                    }}>
                        <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>Waiting for seller acceptance</h3>
                        <div className="timer-display" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>
                            {formatTimer(remainingTime)} ⏳
                        </div>
                    </div>
                )}

                <div className="order-summary-card">
                    <div className="summary-header">
                        <h2>Order Summary</h2>
                        <span className="order-number">#{order.order_number || order.id}</span>
                    </div>

                    <div className="summary-details">
                        <div className="detail-group">
                            <h3>Delivery Address</h3>
                            <p className="address-name">{order.customer_name}</p>
                            <p>{order.delivery_address}</p>
                            <p>{order.customer_phone}</p>
                        </div>

                        <div className="detail-group items-list">
                            <h3>Items</h3>
                            {itemsList.map(item => (
                                <div key={item.id} className="summary-item">
                                    <span className="item-qty">{item.quantity}x</span>
                                    <span className="item-name">{item.item_name || 'Unknown Item'}</span>
                                    <span className="item-price">₹{parseFloat(item.subtotal || 0).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="detail-group totals">
                            <div className="total-row">
                                <span>Subtotal</span>
                                <span>₹{order.items_total || 0}</span>
                            </div>
                            <div className="total-row">
                                <span>Delivery Fee</span>
                                <span>₹{order.delivery_charge || 0}</span>
                            </div>
                            <div className="total-row">
                                <span>Handling Charge</span>
                                <span>₹{order.handling_charge || 0}</span>
                            </div>
                            <div className="total-row grand-total">
                                <span>Total Amount</span>
                                <span>₹{order.total_amount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="success-actions">
                    <button onClick={() => navigate(`/orders/${order.id}`)} className="btn btn-primary">
                        Track Order
                    </button>
                    <button onClick={() => navigate('/home')} className="btn btn-secondary">
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmation;
