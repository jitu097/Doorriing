import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecentOrder } from '../../context/RecentOrderContext';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import './OrderNotification.css';

const OrderNotification = () => {
  const navigate = useNavigate();
  const { recentOrder, clearRecentOrder } = useRecentOrder();
  const [remainingTime, setRemainingTime] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  useEffect(() => {
    if (recentOrder) {
      setIsVisible(true);
      setCurrentOrder(recentOrder);
      setRemainingTime(recentOrder.remaining_time || 600);
    }
  }, [recentOrder]);

  // Poll for order status updates
  useEffect(() => {
    if (!isVisible || !currentOrder?.id) return;

    const pollStatusInterval = setInterval(async () => {
      try {
        const response = await orderService.getOrderById(currentOrder.id);
        if (response.success && response.data) {
          setCurrentOrder(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch order status:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollStatusInterval);
  }, [isVisible, currentOrder?.id]);

  // Timer countdown
  useEffect(() => {
    if (!isVisible || !remainingTime) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, remainingTime]);

  // Auto-dismiss when delivered
  useEffect(() => {
    if (currentOrder?.status === 'delivered') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        clearRecentOrder();
      }, 5000); // Show for 5 seconds after delivered
      return () => clearTimeout(timer);
    }
  }, [currentOrder?.status, clearRecentOrder]);

  const formatTimer = (seconds) => {
    if (seconds === null) return '--:--';
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleClick = () => {
    if (recentOrder?.id) {
      navigate(`/track/${recentOrder.id}`);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    clearRecentOrder();
  };

  if (!isVisible || !currentOrder) return null;

  const statusInfo = getStatusLabel(currentOrder.status);

  return (
    <div className="order-notification" onClick={handleClick}>
      <div className="notification-content">
        <div className="notification-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <div className="notification-body">
          <div className="notification-title">Order #{currentOrder.order_number || currentOrder.id}</div>
          <div className={`notification-status ${statusInfo.colorClass}`}>
            {statusInfo.label}
          </div>
          {currentOrder.status === 'pending' && remainingTime > 0 && (
            <div className="notification-timer">{formatTimer(remainingTime)} ⏳</div>
          )}
        </div>

        <button className="notification-track-btn" onClick={handleClick}>
          Track
        </button>

        <button className="notification-close" onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default OrderNotification;
