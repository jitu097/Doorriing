import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import './OrdersList.css';

const OrdersList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const response = await orderService.getOrders();

        // Transform backend format to UI format if needed, or just use it directly
        // Backend returns: [{ id, order_number, shop_id, total_amount, status, created_at }, ...]
        const mappedOrders = (response.data || []).map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          shopName: o.shop_id || 'BazarSe Shop', // Without join, shopName may need extra fetching, keeping graceful fallback
          items: [], // Summary view doesn't bring items in this list endpoint
          totalAmount: o.total_amount,
          status: o.status,
          orderDate: o.created_at,
        }));
        setOrders(mappedOrders);
      } catch (err) {
        console.error('Failed to fetch orders', err);
        setErrorMsg('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Status helper mapping handles UI text and color

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['preparing', 'on-the-way', 'pending'].includes(order.status);
    if (activeTab === 'completed') return order.status === 'delivered';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const handleOrderClick = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const handleReorder = (order, e) => {
    e.stopPropagation();
    console.log('Reordering:', order);
    // Add reorder logic here
  };

  const handleTrackOrder = (order, e) => {
    e.stopPropagation();
    console.log('Tracking order:', order.id);
    // Add tracking logic here
  };

  return (
    <div className="orders-container">
      <div className="orders-wrapper">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>Track, return, or buy things again</p>
        </div>

        <div className="orders-tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders
            <span className="tab-count">{orders.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active
            <span className="tab-count">
              {orders.filter(o => ['preparing', 'on-the-way', 'pending'].includes(o.status)).length}
            </span>
          </button>
          <button
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
            <span className="tab-count">
              {orders.filter(o => o.status === 'delivered').length}
            </span>
          </button>
          <button
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
            <span className="tab-count">
              {orders.filter(o => o.status === 'cancelled').length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="orders-loading">
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
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
            {filteredOrders.map(order => (
              <div
                key={order.id}
                className="order-card"
                onClick={() => handleOrderClick(order.id)}
              >
                <div className="order-card-header">
                  <div className="order-info">
                    <h3>{order.shopName}</h3>
                    <span className="order-id">Order #{order.orderNumber}</span>
                  </div>
                  <span className={`status-badge ${getStatusLabel(order.status).colorClass}`}>
                    {getStatusLabel(order.status).label}
                  </span>
                </div>

                <div className="order-items">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">x{item.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div className="order-item">
                      <span className="item-name">Items summary not available in this view.</span>
                    </div>
                  )}
                </div>

                <div className="order-details-row">
                  <div className="detail-item">
                    <span className="detail-label">Order Date</span>
                    <span className="detail-value">{new Date(order.orderDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value price">₹{order.totalAmount}</span>
                  </div>
                  {order.status === 'delivered' && order.deliveryDate && (
                    <div className="detail-item">
                      <span className="detail-label">Delivered On</span>
                      <span className="detail-value">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {(order.status === 'preparing' || order.status === 'on-the-way') && order.estimatedDelivery && (
                    <div className="detail-item">
                      <span className="detail-label">Estimated Delivery</span>
                      <span className="detail-value eta">{order.estimatedDelivery}</span>
                    </div>
                  )}
                </div>

                <div className="order-actions">
                  {order.status === 'delivered' && (
                    <>
                      <button
                        className="action-btn secondary"
                        onClick={(e) => handleReorder(order, e)}
                      >
                        Reorder
                      </button>
                      <button className="action-btn secondary">
                        Rate Order
                      </button>
                    </>
                  )}
                  {(order.status === 'preparing' || order.status === 'on-the-way') && (
                    <>
                      <button
                        className="action-btn primary"
                        onClick={(e) => handleTrackOrder(order, e)}
                      >
                        Track Order
                      </button>
                      <button className="action-btn secondary">
                        Contact Support
                      </button>
                    </>
                  )}
                  {order.status === 'cancelled' && order.refundStatus && (
                    <div className="refund-status">
                      Refund Status: <strong>{order.refundStatus}</strong>
                    </div>
                  )}
                  <button className="action-btn outline">
                    View Details
                  </button>
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
