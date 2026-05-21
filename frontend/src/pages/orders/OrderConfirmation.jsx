import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import './OrderConfirmation.css';

/* ─── helper: resolve payment label ─────────────────────────────────────── */
const getPaymentLabel = (method) => {
    if (!method) return { icon: '💵', label: 'Payment' };
    const m = String(method).toLowerCase();
    if (m === 'online' || m === 'card') return { icon: '💳', label: 'Online Payment' };
    if (m === 'cod') return { icon: '💵', label: 'Cash on Delivery' };
    return { icon: '💵', label: method };
};

/* ─── helper: format address string ─────────────────────────────────────── */
const formatAddress = (addr) => {
    if (!addr) return 'Address not available';
    return addr;
};

/* ─── animated checkmark SVG ────────────────────────────────────────────── */
const AnimatedCheck = () => (
    <div className="oc-check-wrapper" aria-hidden="true">
        <div className="oc-check-ring" />
        <svg viewBox="0 0 80 80" className="oc-check-svg" role="img" aria-label="Success">
            <circle
                cx="40" cy="40" r="32"
                fill="none" stroke="currentColor" strokeWidth="3"
                className="oc-circle"
            />
            <path
                fill="none" stroke="currentColor" strokeWidth="4"
                strokeLinecap="round" strokeLinejoin="round"
                d="M26 40 L36 50 L52 30"
                className="oc-tick"
            />
        </svg>
    </div>
);

/* ─── skeleton loader ────────────────────────────────────────────────────── */
const SkeletonLoader = () => (
    <div className="oc-page">
        <div className="oc-hero oc-hero--loading">
            <div className="oc-skeleton oc-skeleton--circle" />
            <div className="oc-skeleton oc-skeleton--bar" style={{ width: '60%' }} />
            <div className="oc-skeleton oc-skeleton--bar" style={{ width: '40%' }} />
        </div>
        <div className="oc-card">
            {[1, 2, 3].map(i => (
                <div key={i} className="oc-skeleton oc-skeleton--line" />
            ))}
        </div>
    </div>
);

/* ─── error state ────────────────────────────────────────────────────────── */
const ErrorState = ({ message, orderId, onRetry, onHome }) => (
    <div className="oc-page">
        <div className="oc-error-card">
            <div className="oc-error-icon">⚠️</div>
            <h2 className="oc-error-title">Could not load order</h2>
            <p className="oc-error-msg">{message}</p>
            {orderId && (
                <p className="oc-error-hint">
                    Your order reference: <strong>{orderId}</strong>
                </p>
            )}
            <div className="oc-actions">
                <button className="oc-btn oc-btn--primary" onClick={onRetry}>
                    Try Again
                </button>
                <button className="oc-btn oc-btn--ghost" onClick={onHome}>
                    Go Home
                </button>
            </div>
        </div>
    </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════════════ */
const OrderConfirmation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderId = searchParams.get('orderId');
    const isOnlinePayment = searchParams.get('payment') === 'success';

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Poll timer — keep order status live for COD (seller may accept)
    const pollRef = useRef(null);

    const fetchOrder = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            setErrorMsg(null);
            const response = await orderService.getOrderById(orderId);
            if (response?.data) {
                setOrder(response.data);
            } else {
                setErrorMsg('Order data not available.');
            }
        } catch (err) {
            console.error('[OrderConfirmation] fetch error:', err);
            setErrorMsg(
                err?.status === 404
                    ? 'This order could not be found. It may have been removed.'
                    : 'Could not connect to the server. Please check your connection.'
            );
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    useEffect(() => {
        if (!orderId) {
            // No orderId in URL — show error, do NOT auto-redirect
            setLoading(false);
            setErrorMsg('No order ID was provided.');
            return;
        }

        fetchOrder(true);

        // Poll every 5 seconds (lighter than before) — stops when status is terminal
        pollRef.current = setInterval(() => {
            setOrder(prev => {
                const terminal = ['confirmed', 'delivered', 'cancelled', 'expired'];
                if (prev && terminal.includes(prev.status)) {
                    clearInterval(pollRef.current);
                    return prev;
                }
                return prev; // trigger fetch via side-effect below
            });
            fetchOrder(false);
        }, 5000);

        return () => clearInterval(pollRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, retryCount]);

    const handleRetry = () => setRetryCount(c => c + 1);

    /* ── loading ── */
    if (loading) return <SkeletonLoader />;

    /* ── error / no order ── */
    if (errorMsg || !order) {
        return (
            <ErrorState
                message={errorMsg || 'Order not found.'}
                orderId={orderId}
                onRetry={handleRetry}
                onHome={() => navigate('/home')}
            />
        );
    }

    /* ── derived display values ── */
    const payInfo = getPaymentLabel(order.payment_method);
    const itemsList = order.order_items || [];
    const shopDisplayName = order.shops?.name || '';

    const totalAmount = parseFloat(order.total_amount || 0).toFixed(0);
    const subtotal = parseFloat(order.items_total || 0).toFixed(0);
    const deliveryCharge = parseFloat(order.delivery_charge || 0).toFixed(0);
    const handlingCharge = parseFloat(order.handling_charge || 0).toFixed(0);

    const orderDisplayId = order.order_number || order.id;

    /* ── hero banner copy based on payment type ── */
    const heroBadgeText = isOnlinePayment ? '✅ Payment Successful' : '📦 Order Placed';
    const heroTitle = isOnlinePayment ? 'Payment Confirmed!' : 'Order Placed Successfully!';
    const heroSubtitle = isOnlinePayment
        ? 'Your payment was processed and the order is confirmed.'
        : 'Your order has been placed and is waiting for seller confirmation.';

    // Determine estimated delivery range based on shop type or shop name heuristics
    const shop = order.shops || order.shop || {};
    const shopName = (shop.name || order.shop_name || '').toString();
    const candidates = [
        shop.type,
        shop.business_type,
        shop.businessType,
        shop.category,
        shop.category_name,
        order.shop_type,
        order.shop_category,
        shop.kind,
    ].filter(Boolean).map(s => String(s).toLowerCase());

    const loweredName = shopName.toLowerCase();

    const isGrocery = candidates.some(s => s.includes('grocery') || s.includes('mart') || s.includes('super'))
        || loweredName.includes('grocery') || loweredName.includes('mart') || loweredName.includes('store');

    const isRestaurant = candidates.some(s => s.includes('rest') || s.includes('restaurant') || s.includes('food'))
        || loweredName.includes('biryani') || loweredName.includes('restaurant') || loweredName.includes('dhaba') || loweredName.includes('cafe') || loweredName.includes('hotel');

    const etaValue = isRestaurant ? '45 – 60 minutes' : isGrocery ? '20 – 30 minutes' : '20 – 40 minutes';

    return (
        <div className="oc-page">

            {/* ── HERO SUCCESS SECTION ── */}
            <div className={`oc-hero ${isOnlinePayment ? 'oc-hero--paid' : 'oc-hero--cod'}`}>
                <AnimatedCheck />

                <h1 className="oc-hero-title">{heroTitle}</h1>
                <p className="oc-hero-sub">{heroSubtitle}</p>

                <div className="oc-order-id-pill">
                    <span className="oc-order-id-label">Order ID</span>
                    <span className="oc-order-id-value">#{orderDisplayId}</span>
                </div>
            </div>

            {/* ── BODY CONTENT ── */}
            <div className="oc-body">

                {/* Payment method chip */}
                <div className="oc-payment-chip">
                    <span className="oc-payment-icon">{payInfo.icon}</span>
                    <span className="oc-payment-label">{payInfo.label}</span>
                    {order.payment_status === 'paid' && (
                        <span className="oc-payment-badge">Paid</span>
                    )}
                </div>

                {/* Shop info (if available) */}
                {shopDisplayName && (
                    <div className="oc-card oc-card--shop">
                        <span className="oc-card-icon">🏪</span>
                        <span className="oc-card-text">{shopDisplayName}</span>
                    </div>
                )}

                {/* Delivery address */}
                <div className="oc-card">
                    <div className="oc-card-label">
                        <span className="oc-card-icon">📍</span>
                        Delivery Address
                    </div>
                    <p className="oc-card-value">{formatAddress(order.delivery_address)}</p>
                </div>

                {/* Items list */}
                {itemsList.length > 0 && (
                    <div className="oc-card">
                        <div className="oc-card-label">
                            <span className="oc-card-icon">🛒</span>
                            Items ({itemsList.length})
                        </div>
                        <div className="oc-items-list">
                            {itemsList.map((item, idx) => (
                                <div key={item.id || idx} className="oc-item-row">
                                    <span className="oc-item-qty">{item.quantity}×</span>
                                    <span className="oc-item-name">
                                        {item.item_name || 'Item'}
                                    </span>
                                    <span className="oc-item-price">
                                        ₹{parseFloat(item.subtotal || item.item_price * item.quantity || 0).toFixed(0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bill breakdown */}
                <div className="oc-card oc-card--bill">
                    <div className="oc-card-label">
                        <span className="oc-card-icon">🧾</span>
                        Bill Details
                    </div>
                    <div className="oc-bill-rows">
                        <div className="oc-bill-row">
                            <span>Items Total</span>
                            <span>₹{subtotal}</span>
                        </div>
                        <div className="oc-bill-row">
                            <span>Delivery Fee</span>
                            <span>{Number(deliveryCharge) === 0 ? '🎉 Free' : `₹${deliveryCharge}`}</span>
                        </div>
                        {Number(handlingCharge) > 0 && (
                            <div className="oc-bill-row">
                                <span>Handling Charge</span>
                                <span>₹{handlingCharge}</span>
                            </div>
                        )}
                        <div className="oc-bill-row oc-bill-row--total">
                            <span>Total Paid</span>
                            <span>₹{totalAmount}</span>
                        </div>
                    </div>
                </div>

                {/* Estimated delivery */}
                <div className="oc-eta-card">
                    <span className="oc-eta-icon">⏱️</span>
                    <div>
                        <div className="oc-eta-label">Estimated Delivery</div>
                        <div className="oc-eta-value">{etaValue}</div>
                    </div>
                </div>

                {/* CTA buttons */}
                <div className="oc-actions">
                    <div className="oc-actions-row">
                        <button
                            id="btn-track-order"
                            className="oc-btn oc-btn--primary"
                            onClick={() => navigate(`/orders/${order.id}`)}
                        >
                            Track Order
                        </button>
                        <button
                            id="btn-view-orders"
                            className="oc-btn oc-btn--secondary"
                            onClick={() => navigate('/orders')}
                        >
                            View All Orders
                        </button>
                    </div>

                    <button
                        id="btn-back-home"
                        className="oc-btn oc-btn--ghost"
                        onClick={() => navigate('/home')}
                    >
                       ← Back to Home
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OrderConfirmation;
