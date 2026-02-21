import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  // Sample order data - replace with API call
  const [order] = useState({
    id: orderId || 'ORD-2024-001',
    shopName: 'Fresh Mart Grocery',
    shopType: 'grocery',
    shopAddress: '456 Market Street, Downtown',
    shopPhone: '+1 234-567-8900',
    items: [
      { 
        id: 1,
        name: 'Organic Apples', 
        quantity: 2, 
        price: 120,
        image: 'https://via.placeholder.com/80'
      },
      { 
        id: 2,
        name: 'Brown Bread', 
        quantity: 1, 
        price: 45,
        image: 'https://via.placeholder.com/80'
      },
      { 
        id: 3,
        name: 'Fresh Milk', 
        quantity: 2, 
        price: 60,
        image: 'https://via.placeholder.com/80'
      }
    ],
    subtotal: 225,
    deliveryFee: 40,
    tax: 13,
    discount: 30,
    totalAmount: 248,
    status: 'on-the-way',
    orderDate: '2024-02-20T10:30:00',
    estimatedDelivery: '45 mins',
    paymentMethod: 'Online - UPI',
    transactionId: 'TXN123456789',
    deliveryAddress: {
      name: 'John Doe',
      phone: '+1 234-567-8901',
      address: '123 Main Street, Apartment 4B',
      city: 'New York',
      postalCode: '10001'
    },
    tracking: [
      { status: 'Order Placed', time: '10:30 AM', completed: true },
      { status: 'Confirmed', time: '10:32 AM', completed: true },
      { status: 'Preparing', time: '10:35 AM', completed: true },
      { status: 'Out for Delivery', time: '11:00 AM', completed: true },
      { status: 'Delivered', time: 'Expected by 11:15 AM', completed: false }
    ]
  });

  const getStatusColor = (status) => {
    const colors = {
      'delivered': '#4CAF50',
      'on-the-way': '#2196F3',
      'preparing': '#FF9800',
      'cancelled': '#f44336'
    };
    return colors[status] || '#999';
  };

  return (
    <div className="order-details-container">
      <div className="order-details-wrapper">
        <button className="back-btn" onClick={() => navigate('/orders')}>
          ← Back to Orders
        </button>

        <div className="order-header-section">
          <div className="order-header-main">
            <div>
              <h1>Order Details</h1>
              <p className="order-number">Order #{order.id}</p>
            </div>
            <div className="order-status-badge" style={{ background: getStatusColor(order.status) }}>
              {order.status.replace('-', ' ').toUpperCase()}
            </div>
          </div>
          <div className="order-time-info">
            <div className="time-item">
              <span className="time-label">Ordered on</span>
              <span className="time-value">
                {new Date(order.orderDate).toLocaleString()}
              </span>
            </div>
            {order.estimatedDelivery && (
              <div className="time-item">
                <span className="time-label">Estimated Delivery</span>
                <span className="time-value highlight">{order.estimatedDelivery}</span>
              </div>
            )}
          </div>
        </div>

        <div className="order-main-content">
          <div className="left-column">
            {/* Order Tracking */}
            <div className="detail-card tracking-card">
              <h2>Order Tracking</h2>
              <div className="tracking-timeline">
                {order.tracking.map((step, index) => (
                  <div key={index} className={`tracking-step ${step.completed ? 'completed' : ''}`}>
                    <div className="step-marker">
                      {step.completed ? (
                        <div className="marker-dot completed">✓</div>
                      ) : (
                        <div className="marker-dot"></div>
                      )}
                      {index < order.tracking.length - 1 && (
                        <div className={`step-line ${step.completed ? 'completed' : ''}`}></div>
                      )}
                    </div>
                    <div className="step-content">
                      <h4>{step.status}</h4>
                      <p>{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="detail-card items-card">
              <h2>Items Ordered</h2>
              <div className="items-list-detailed">
                {order.items.map(item => (
                  <div key={item.id} className="item-detailed">
                    <img src={item.image} alt={item.name} className="item-image" />
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-qty">Quantity: {item.quantity}</p>
                    </div>
                    <div className="item-price">₹{item.price}</div>
                  </div>
                ))}
              </div>

              <div className="price-breakdown">
                <div className="price-row">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="price-row">
                  <span>Delivery Fee</span>
                  <span>₹{order.deliveryFee}</span>
                </div>
                <div className="price-row">
                  <span>Tax</span>
                  <span>₹{order.tax}</span>
                </div>
                {order.discount > 0 && (
                  <div className="price-row discount">
                    <span>Discount</span>
                    <span>-₹{order.discount}</span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="right-column">
            {/* Shop Information */}
            <div className="detail-card shop-card">
              <h2>Shop Details</h2>
              <div className="shop-info">
                <h3>{order.shopName}</h3>
                <p>{order.shopAddress}</p>
                <p className="shop-phone">📞 {order.shopPhone}</p>
                <button className="contact-shop-btn">Contact Shop</button>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="detail-card address-card">
              <h2>Delivery Address</h2>
              <div className="address-info">
                <h4>{order.deliveryAddress.name}</h4>
                <p>{order.deliveryAddress.address}</p>
                <p>{order.deliveryAddress.city} - {order.deliveryAddress.postalCode}</p>
                <p className="address-phone">📞 {order.deliveryAddress.phone}</p>
              </div>
            </div>

            {/* Payment Information */}
            <div className="detail-card payment-card">
              <h2>Payment Details</h2>
              <div className="payment-info">
                <div className="payment-row">
                  <span className="payment-label">Payment Method</span>
                  <span className="payment-value">{order.paymentMethod}</span>
                </div>
                {order.transactionId && (
                  <div className="payment-row">
                    <span className="payment-label">Transaction ID</span>
                    <span className="payment-value transaction-id">{order.transactionId}</span>
                  </div>
                )}
                <div className="payment-row">
                  <span className="payment-label">Amount Paid</span>
                  <span className="payment-value amount">₹{order.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="detail-card actions-card">
              <button className="detail-action-btn primary">Need Help?</button>
              <button className="detail-action-btn secondary">Download Invoice</button>
              {order.status === 'delivered' && (
                <button className="detail-action-btn secondary">Rate Order</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
