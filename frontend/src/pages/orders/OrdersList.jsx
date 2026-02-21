import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrdersList.css';

const OrdersList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sample orders data - replace with API call
  const sampleOrders = [
    {
      id: 'ORD-2024-001',
      shopName: 'Fresh Mart Grocery',
      shopType: 'grocery',
      items: [
        { name: 'Organic Apples', quantity: 2, price: 120 },
        { name: 'Brown Bread', quantity: 1, price: 45 },
        { name: 'Fresh Milk', quantity: 2, price: 60 }
      ],
      totalAmount: 225,
      status: 'delivered',
      orderDate: '2024-02-18',
      deliveryDate: '2024-02-19',
      paymentMethod: 'Online',
      deliveryAddress: '123 Main Street, Apartment 4B, New York, NY 10001'
    },
    {
      id: 'ORD-2024-002',
      shopName: 'Spice Paradise Restaurant',
      shopType: 'restaurant',
      items: [
        { name: 'Chicken Biryani', quantity: 2, price: 350 },
        { name: 'Paneer Tikka', quantity: 1, price: 180 },
        { name: 'Garlic Naan', quantity: 3, price: 45 }
      ],
      totalAmount: 575,
      status: 'on-the-way',
      orderDate: '2024-02-20',
      estimatedDelivery: '45 mins',
      paymentMethod: 'Cash on Delivery',
      deliveryAddress: '123 Main Street, Apartment 4B, New York, NY 10001'
    },
    {
      id: 'ORD-2024-003',
      shopName: 'Quick Bites Cafe',
      shopType: 'restaurant',
      items: [
        { name: 'Pizza Margherita', quantity: 1, price: 250 },
        { name: 'Cold Coffee', quantity: 2, price: 120 }
      ],
      totalAmount: 370,
      status: 'preparing',
      orderDate: '2024-02-20',
      estimatedDelivery: '30 mins',
      paymentMethod: 'Online',
      deliveryAddress: '123 Main Street, Apartment 4B, New York, NY 10001'
    },
    {
      id: 'ORD-2024-004',
      shopName: 'Green Valley Store',
      shopType: 'grocery',
      items: [
        { name: 'Rice 5kg', quantity: 1, price: 450 },
        { name: 'Cooking Oil', quantity: 1, price: 180 }
      ],
      totalAmount: 630,
      status: 'cancelled',
      orderDate: '2024-02-17',
      cancelledDate: '2024-02-17',
      paymentMethod: 'Online',
      refundStatus: 'Refunded',
      deliveryAddress: '123 Main Street, Apartment 4B, New York, NY 10001'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      setOrders(sampleOrders);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'delivered': 'status-delivered',
      'on-the-way': 'status-on-the-way',
      'preparing': 'status-preparing',
      'cancelled': 'status-cancelled',
      'pending': 'status-pending'
    };
    return statusClasses[status] || 'status-default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'delivered': '✓',
      'on-the-way': '🚚',
      'preparing': '👨‍🍳',
      'cancelled': '✕',
      'pending': '⏱️'
    };
    return icons[status] || '📦';
  };

  const getStatusText = (status) => {
    const texts = {
      'delivered': 'Delivered',
      'on-the-way': 'On the Way',
      'preparing': 'Preparing',
      'cancelled': 'Cancelled',
      'pending': 'Pending'
    };
    return texts[status] || status;
  };

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
                    <span className="order-id">Order #{order.id}</span>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    <span className="status-icon">{getStatusIcon(order.status)}</span>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">x{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="more-items">
                      +{order.items.length - 2} more items
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
