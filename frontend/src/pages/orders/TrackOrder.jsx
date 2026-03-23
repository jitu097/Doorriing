import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import './TrackOrder.css';

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const steps = [
    { label: 'Order Placed', status: 'pending' },
    { label: 'Accepted', status: 'accepted' },
    { label: 'Preparing', status: 'preparing' },
    { label: 'Out for Delivery', status: 'out_for_delivery' },
    { label: 'Delivered', status: 'delivered' }
  ];

  useEffect(() => {
    const fetchOrder = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await orderService.getOrderById(orderId);
        if (response.success) {
          setOrder(response.data);
        }
      } catch (err) {
        console.error('Track Order fetch error', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder(true);
      const pollId = setInterval(() => fetchOrder(false), 5000);
      return () => clearInterval(pollId);
    }
  }, [orderId]);

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    const currentStatus = order.status.toLowerCase();
    
    // Map status to step index
    if (currentStatus === 'cancelled' || currentStatus === 'rejected' || currentStatus === 'expired') return -1;
    
    // Handle status variations
    const statusMap = {
        'pending': 0,
        'accepted': 1,
        'confirmed': 1, // alias
        'preparing': 2,
        'packing': 2,
        'ready': 2,
        'out_for_delivery': 3,
        'on-the-way': 3,
        'delivered': 4
    };
    
    return statusMap[currentStatus] ?? -1;
  };

  if (loading) return <div className="track-loading"><div className="spinner"></div><p>Fetching tracking info...</p></div>;
  if (!order) return <div className="track-error">Order not found. <button onClick={() => navigate('/orders')}>Back to Orders</button></div>;

  const currentStepIdx = getCurrentStepIndex();
  const isCancelled = ['cancelled', 'rejected', 'expired'].includes(order.status.toLowerCase());

  return (
    <div className="track-container">
      <div className="track-wrapper">
        <header className="track-header">
          <button className="back-link" onClick={() => navigate(`/orders/${orderId}`)}>← Back to Order</button>
          <h1>Track Your Order</h1>
          <p className="order-no">Order #{order.order_number.substring(order.order_number.length - 8)}</p>
        </header>

        <div className="track-content">
          {isCancelled ? (
            <div className="cancelled-notice">
              <h2>Order {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</h2>
              <p>We're sorry, this order has been {order.status}.</p>
            </div>
          ) : (
            <div className="tracking-stepper">
              {steps.map((step, index) => (
                <div key={index} className={`step ${index <= currentStepIdx ? 'completed' : ''} ${index === currentStepIdx ? 'active' : ''}`}>
                  <div className="step-marker">
                    {index < currentStepIdx ? '✓' : index + 1}
                  </div>
                  <div className="step-label">
                    {step.label}
                    {index === currentStepIdx && <span className="pulse"></span>}
                  </div>
                  {index < steps.length - 1 && <div className="step-line"></div>}
                </div>
              ))}
            </div>
          )}

          <div className="tracking-footer">
            <div className="shop-info">
              <h3>Delivery from</h3>
              <p>{order.shops?.name || 'BazarSe Shop'}</p>
            </div>
            <div className="eta-info">
              <h3>Estimated Time</h3>
              <p>{currentStepIdx < 4 ? 'Arriving in 25-35 mins' : 'Delivered'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
