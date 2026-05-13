import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import './CallDriver.css';

const CallDriver = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await orderService.getOrderById(orderId);
        if (response.success) {
          setOrder(response.data);
        }
      } catch (error) {
        console.error('Call driver fetch error', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const phone = order?.delivery_partner_phone || order?.deliveryPartnerPhone || '';

  if (loading) {
    return (
      <div className="call-driver-page">
        <div className="call-driver-card">
          <p>Loading driver contact...</p>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="call-driver-page">
        <div className="call-driver-card">
          <h1>Driver not assigned yet</h1>
          <p>The phone number will appear here after the order is accepted.</p>
          <button type="button" className="call-driver-back" onClick={() => navigate(`/track/${orderId}`)}>
            Back to tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-driver-page">
      <div className="call-driver-card">
        <p className="call-driver-label">Delivery partner phone</p>
        <h1>{phone}</h1>
        <p className="call-driver-note">Tap the button below to open your phone app.</p>
        <a className="call-driver-button" href={`tel:${phone}`}>
          Call now
        </a>
        <button type="button" className="call-driver-back" onClick={() => navigate(`/track/${orderId}`)}>
          Back to tracking
        </button>
      </div>
    </div>
  );
};

export default CallDriver;