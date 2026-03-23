import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import './OrdersList.css';

const OrdersList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const response = await orderService.getOrders();

        if (response.success) {
          const mappedOrders = (response.data || []).map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            shopName: o.shops?.name || 'BazarSe Shop',
            items: (o.order_items || []).map(item => ({
              name: item.item_name,
              quantity: item.quantity
            })),
            itemCount: (o.order_items || []).reduce((acc, item) => acc + item.quantity, 0),
            totalAmount: o.total_amount,
            status: o.status,
            orderDate: o.created_at,
          }));
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
        setErrorMsg('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleOrderClick = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const handleTrackOrder = (orderId, e) => {
    e.stopPropagation();
    navigate(`/track/${orderId}`);
  };

  return (
    <div className="orders-container">
      <div className="orders-wrapper">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>Track your real-time deliveries</p>
        </div>

        {loading ? (
          <div className="orders-loading">
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <div className="empty-icon">📦</div>
            <h2>No orders found</h2>
            <p>You haven't placed any orders yet. Start shopping now!</p>
            <button className="shop-now-btn" onClick={() => navigate('/')}>
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="orders-list">
            <div className="all-orders-label">All Orders ({orders.length})</div>
            {orders.map(order => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => handleOrderClick(order.id)}
              >
                <div className="order-card-header">
                  <div className="order-info">
                    <h3>{order.shopName}</h3>
                    <span className="order-id">Order ID: {order.orderNumber.substring(order.orderNumber.length - 8)}</span>
                  </div>
                  <span className={`status-badge ${getStatusLabel(order.status).colorClass}`}>
                    {getStatusLabel(order.status).label}
                  </span>
                </div>

                <div className="order-items-summary">
                   {order.items && order.items.length > 0 ? (
                      <span className="items-text">
                        {order.items.slice(0, 2).map(i => `${i.name} x${i.quantity}`).join(', ')}
                        {order.items.length > 2 ? ` + ${order.items.length - 2} more` : ''}
                      </span>
                   ) : (
                      <span className="items-text">Refreshing order items...</span>
                   )}
                </div>

                <div className="order-details-bottom">
                  <div className="detail-item">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value price">₹{order.totalAmount}</span>
                  </div>
                  <div className="order-card-actions">
                    <button 
                      className="track-btn"
                      onClick={(e) => handleTrackOrder(order.id, e)}
                    >
                      Track Order
                    </button>
                    <button className="view-details-btn">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;
