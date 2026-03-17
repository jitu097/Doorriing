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
  const [remainingTime, setRemainingTime] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  useEffect(() => {
    let intervalId;
    let pollId;

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
            status: o.status,
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
          setRemainingTime(o.remaining_time ?? null);
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
      // Poll order API every 3 seconds
      pollId = setInterval(() => fetchOrderDetails(false), 3000);
      intervalId = setInterval(() => {
        setRemainingTime(prev => {
          if (prev === null) return null;
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(pollId);
      clearInterval(intervalId);
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

  // Timer formatting
  const formatTimer = (seconds) => {
    if (seconds === null) return '--:--';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="order-details-container">
      <div className="order-details-wrapper">
        <button className="back-btn" onClick={() => navigate('/orders')}>
          ← Back to Orders
        </button>

        {/* Real-time order acceptance tracking UI */}
        {order.status === 'pending' && (
          <div className="order-status-section" style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ color: '#ff9800' }}>Waiting for seller to accept your order</h2>
            <div className="timer-box" style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800', margin: '10px 0' }}>
              Time remaining: {formatTimer(remainingTime)} ⏳
            </div>
          </div>
        )}
        {order.status === 'accepted' && (
          <div className="order-status-section" style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ color: '#4caf50' }}>Your order has been accepted ✅</h2>
          </div>
        )}
        {order.status === 'expired' && (
          <div className="order-status-section" style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ color: '#f44336' }}>Sorry, the seller was unable to accept your order. Please try another shop or try again later.</h2>
            <button className="browse-shops-btn" style={{ marginTop: '20px', background: '#ff9800', color: '#fff', padding: '12px 24px', borderRadius: '6px', fontSize: '1.1rem', border: 'none' }} onClick={() => navigate('/shops')}>Browse Shops</button>
          </div>
        )}
        {order.status === 'rejected' && (
          <div className="order-status-section" style={{ textAlign: 'center', margin: '30px 0' }}>
            <h2 style={{ color: '#f44336' }}>Your order was rejected by the seller. Please try another shop.</h2>
          </div>
        )}

        {/* ...existing code... */}
        <div className="order-header-section">
          {/* ...existing code... */}
        </div>
        <div className="order-main-content">
          {/* ...existing code... */}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
