import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    let timerId;
    const fetchOrderDetails = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await orderService.getOrderById(orderId);
        if (response.success && response.data) {
          const o = response.data;
          setOrder({
            id: o.id,
            orderNumber: o.order_number,
            shopName: o.shops?.name || 'BazarSe Shop',
            shopAddress: o.shops?.address || '',
            shopPhone: o.shops?.phone || '',
            items: (o.order_items || []).map(oi => ({
              id: oi.id,
              name: oi.item_name,
              quantity: oi.quantity,
              price: oi.item_price,
            })),
            subtotal: o.items_total || 0,
            deliveryFee: o.delivery_charge || 0,
            handlingCharge: o.handling_charge || 0,
            totalAmount: o.total_amount,
            status: o.status,
            orderDate: o.created_at,
            paymentMethod: o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online',
            deliveryAddress: o.delivery_address || '',
          });
          setRemainingTime(o.remaining_time ?? null);
        } else {
          setErrorMsg('Order not found');
        }
      } catch (err) {
        console.error('Error fetching order details', err);
        setErrorMsg('Order details could not be loaded.');
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails(true);
      // Poll every 10 seconds for updates
      const pollId = setInterval(() => fetchOrderDetails(false), 10000);
      
      timerId = setInterval(() => {
        setRemainingTime(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      }, 1000);

      return () => {
        clearInterval(pollId);
        clearInterval(timerId);
      };
    }
  }, [orderId]);

  if (loading) return (
    <div className="order-details-loading">
      <div className="spinner"></div>
      <p>Loading order details...</p>
    </div>
  );

  if (errorMsg || !order) return (
    <div className="order-details-error">
      <h2>{errorMsg || 'Order not found'}</h2>
      <button onClick={() => navigate('/orders')}>Back to Orders</button>
    </div>
  );

  const statusInfo = getStatusLabel(order.status);

  const formatTimer = (seconds) => {
    if (seconds === null) return '--:--';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="order-details-container">
      <div className="order-details-wrapper">
        <header className="details-header">
          <button className="back-link" onClick={() => navigate('/orders')}>
            ← Back to Orders
          </button>
          <div className="order-meta">
            <h1>Order #{order.orderNumber.substring(order.orderNumber.length - 8)}</h1>
            <span className={`status-pill ${statusInfo.colorClass}`}>
              {statusInfo.label}
            </span>
          </div>
        </header>

        {order.status === 'pending' && remainingTime > 0 && (
          <div className="acceptance-wait">
            <h3>Waiting for shop to accept...</h3>
            <p>Acceptance deadline: <strong>{formatTimer(remainingTime)}</strong></p>
          </div>
        )}

        <div className="details-grid">
          <section className="order-main">
            <div className="card shop-card">
              <h3>Shop Details</h3>
              <p className="shop-name">{order.shopName}</p>
              <p className="shop-info">{order.shopAddress}</p>
              {order.shopPhone && <p className="shop-info">📞 {order.shopPhone}</p>}
            </div>

            <div className="card items-card">
              <h3>Order Items</h3>
              <div className="items-list">
                {order.items.map((item, idx) => (
                  <div key={idx} className="detail-item-row">
                    <div className="item-qty-name">
                      <span className="qty">{item.quantity} x</span>
                      <span className="name">{item.name}</span>
                    </div>
                    <span className="price">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="bill-summary">
                <div className="bill-row">
                  <span>Item Total</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="bill-row">
                  <span>Delivery Fee</span>
                  <span>₹{order.deliveryFee}</span>
                </div>
                {order.handlingCharge > 0 && (
                  <div className="bill-row">
                    <span>Handling Charge</span>
                    <span>₹{order.handlingCharge}</span>
                  </div>
                )}
                <div className="bill-row total">
                  <span>To Pay</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="order-sidebar">
            <div className="card delivery-card">
              <h3>Delivery Address</h3>
              <p>{order.deliveryAddress}</p>
            </div>
            <div className="card payment-card">
              <h3>Payment Method</h3>
              <p>{order.paymentMethod}</p>
            </div>
            <button 
              className="track-order-btn"
              onClick={() => navigate(`/track/${order.id}`)}
            >
              Track Order
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
