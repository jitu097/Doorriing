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
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let polling = true;
    let timeoutId;

    const fetchOrderDetails = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await orderService.getOrderById(orderId);
        const o = response.data;
        if (o) {
          setOrder({
            id: o.order_number || o.id,
            shopName: o.shop_id || 'BazarSe Shop',
            shopType: 'store',
            shopAddress: '',
            shopPhone: '',
            items: (o.order_items || []).map(oi => ({
              id: oi.id,
              name: oi.items?.name || 'Unknown Item',
              quantity: oi.quantity,
              price: oi.unit_price,
              image: oi.items?.image_url || 'https://via.placeholder.com/80'
            })),
            subtotal: o.items_total || 0,
            deliveryFee: o.delivery_charge || 0,
            tax: 0,
            discount: 0,
            totalAmount: o.total_amount,
            status: o.status || 'placed',
            orderDate: o.created_at,
            estimatedDelivery: o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected' && o.status !== 'expired' ? '45 mins' : null,
            paymentMethod: o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online',
            transactionId: '',
            deliveryAddress: {
              name: o.customer_name || 'Customer',
              phone: o.customer_phone || '',
              address: o.delivery_address || '',
              city: '',
              postalCode: ''
            },
            tracking: [
              { status: 'Order Placed', time: new Date(o.created_at).toLocaleTimeString(), completed: true },
              { status: 'Preparing', time: '', completed: ['preparing', 'packing', 'ready', 'out_for_delivery', 'delivered'].includes(o.status) },
              { status: 'Out for Delivery', time: '', completed: ['out_for_delivery', 'delivered'].includes(o.status) },
              { status: 'Delivered', time: '', completed: o.status === 'delivered' }
            ]
          });

          // Polling logic: keep polling every 10s if status is pending
          if (o.status === 'pending' && polling) {
            timeoutId = setTimeout(() => fetchOrderDetails(false), 10000);
          } else {
            polling = false;
          }
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
    }

    return () => {
      polling = false;
      clearTimeout(timeoutId);
    };
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setCancelling(true);
      await orderService.cancelOrder(orderId);
      // Update local state without waiting for poll
      setOrder(prev => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !order) return <div className="order-details-container" style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  if (errorMsg || !order) return <div className="order-details-container" style={{ padding: '50px', textAlign: 'center', color: 'red' }}>{errorMsg || 'Order not found'}</div>;

  const statusInfo = getStatusLabel(order.status);

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
            <div className={`order-status-badge ${statusInfo.colorClass}`}>
              {statusInfo.label.toUpperCase()}
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

              {order.status === 'pending' && (
                <button
                  className="detail-action-btn"
                  style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
