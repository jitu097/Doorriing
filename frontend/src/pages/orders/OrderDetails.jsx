import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { getStatusLabel } from '../../utils/orderUtils.js';
import ReviewModal from '../../components/common/ReviewModal.jsx';
import ItemReviewModal from '../../components/common/ItemReviewModal.jsx';
import { submitOrderReview, getOrderReview, submitOrderItemReview, getOrderItemReviews } from '../../services/review.service.js';
import './OrderDetails.css';

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewStatusKnown, setReviewStatusKnown] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState(null);
  const [itemReviewsByItemId, setItemReviewsByItemId] = useState({});

  useEffect(() => {
    let timerId;
    const fetchOrderDetails = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await orderService.getOrderById(orderId);
        if (response.success && response.data) {
          const o = response.data;
          
          // Format delivery address
          let deliveryAddressText = '';
          if (o.delivery_address) {
            if (typeof o.delivery_address === 'string') {
              deliveryAddressText = o.delivery_address;
            } else if (typeof o.delivery_address === 'object') {
              const addr = o.delivery_address;
              const parts = [];
              if (addr.address) parts.push(addr.address);
              if (addr.area || addr.city) parts.push(addr.area || addr.city);
              if (addr.phone) {
                if (parts.length > 0) parts.push('Phone:');
                parts.push(addr.phone);
              }
              deliveryAddressText = parts.filter(p => p && p !== 'Phone:').join(', ');
              if (addr.phone && parts.includes('Phone:')) {
                deliveryAddressText = deliveryAddressText.replace(', Phone:', '') + '\nPhone: ' + addr.phone;
              }
            }
          }
          
          const newOrder = {
            id: o.id,
            orderNumber: o.order_number,
            shopName: o.shops?.name || 'BazarSe Shop',
            shopAddress: o.shops?.address || '',
            shopPhone: o.shops?.phone || '',
            items: (o.order_items || []).map(oi => ({
              id: oi.id,
              itemId: oi.item_id,
              name: oi.item_name,
              quantity: oi.quantity,
              portionType: oi.portion_type || oi.portion || null,
              portionLabel: String(oi.portion_type || oi.portion || '').trim().toLowerCase() === 'half'
                ? 'Per Piece'
                : String(oi.portion_type || oi.portion || '').trim().toLowerCase() === 'full'
                  ? 'Per Kg'
                  : null,
              unitPrice: oi.unit_price ?? oi.item_price ?? oi.price ?? null,
              totalPrice: oi.total_price ?? oi.subtotal ?? null,
              price: oi.unit_price ?? oi.item_price ?? oi.price ?? null,
              imageUrl: oi.items?.image_url || '',
              baseQuantity: oi.items?.base_quantity ?? null,
              unit: oi.items?.unit || '',
            })),
            subtotal: o.items_total || 0,
            deliveryFee: o.delivery_charge || 0,
            handlingCharge: o.handling_charge || 0,
            totalAmount: o.total_amount,
            status: o.status,
            orderDate: o.created_at,
            paymentMethod: o.payment_method === 'cod' ? 'Cash on Delivery' : 'Online',
            deliveryAddress: deliveryAddressText || 'Not available',
          };

          // Check if delivered order already has a review before showing modal.
          if (newOrder.status === 'delivered' && !reviewSubmitted && !showReviewModal) {
            if (!reviewStatusKnown) {
              try {
                const existingReview = await getOrderReview(orderId);
                if (existingReview) {
                  setReviewSubmitted(true);
                  setShowReviewModal(false);
                  setReviewStatusKnown(true);
                } else {
                  setReviewStatusKnown(true);
                  // Show review modal after a short delay for smoother UX.
                  setTimeout(() => {
                    setShowReviewModal(true);
                  }, 2000);
                }
              } catch (reviewCheckError) {
                console.error('Error checking existing review:', reviewCheckError);
                setReviewStatusKnown(true);
              }
            } else {
              // Show review modal after a short delay for smoother UX.
              setTimeout(() => {
                setShowReviewModal(true);
              }, 2000);
            }
          }

          setOrder(newOrder);
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
  }, [orderId, reviewSubmitted, showReviewModal, reviewStatusKnown]);

  const handleReviewSubmit = async (reviewData) => {
    setReviewLoading(true);
    try {
      await submitOrderReview(reviewData.orderId, reviewData.rating, reviewData.comment);
      setReviewSubmitted(true);
      setReviewStatusKnown(true);
      setShowReviewModal(false);
    } catch (error) {
      if (error?.status === 409) {
        // Review already exists (duplicate submission / retry case).
        setReviewSubmitted(true);
        setReviewStatusKnown(true);
        setShowReviewModal(false);
        return;
      }
      console.error('Error submitting review:', error);
      throw error;
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    const fetchItemReviews = async () => {
      if (!orderId || !order || order.status !== 'delivered') {
        return;
      }

      try {
        const itemReviews = await getOrderItemReviews(orderId);
        const mapped = (itemReviews || []).reduce((acc, review) => {
          if (review?.item_id) {
            acc[review.item_id] = review;
          }
          return acc;
        }, {});
        setItemReviewsByItemId(mapped);
      } catch (error) {
        console.error('Failed to fetch item reviews:', error);
      }
    };

    fetchItemReviews();
  }, [orderId, order]);

  const handleItemReviewSubmit = async (reviewData) => {
    try {
      const review = await submitOrderItemReview(
        reviewData.orderId,
        reviewData.itemId,
        reviewData.rating,
        reviewData.comment
      );

      setItemReviewsByItemId((prev) => ({
        ...prev,
        [reviewData.itemId]: {
          ...(review || {}),
          item_id: reviewData.itemId,
          rating: reviewData.rating,
          comment: reviewData.comment,
        },
      }));

      setSelectedItemForReview(null);
    } catch (error) {
      if (error?.status === 409) {
        const latest = await getOrderItemReviews(reviewData.orderId);
        const mapped = (latest || []).reduce((acc, review) => {
          if (review?.item_id) {
            acc[review.item_id] = review;
          }
          return acc;
        }, {});
        setItemReviewsByItemId(mapped);
        setSelectedItemForReview(null);
        return;
      }
      throw error;
    }
  };

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
            ← 
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
                    {item.imageUrl ? (
                      <div className="detail-item-image">
                        <img src={item.imageUrl} alt={item.name} loading="lazy" />
                      </div>
                    ) : null}
                    <div className="item-qty-name">
                      <div className="item-name-line">
                        <span className="qty">{item.quantity} x</span>
                        <span className="name">
                          {item.name}
                          {item.portionLabel ? ` (${item.portionLabel})` : ''}
                        </span>
                      </div>
                      {item.baseQuantity !== null && item.baseQuantity !== undefined && item.unit ? (
                        <span className="base-quantity">{item.baseQuantity}{item.unit}</span>
                      ) : null}
                      {order.status === 'delivered' && item.itemId ? (
                        <div className="item-review-row">
                          {itemReviewsByItemId[item.itemId] ? (
                            <span className="item-reviewed-badge">
                              Reviewed: {'★'.repeat(Math.max(0, Math.min(5, itemReviewsByItemId[item.itemId].rating || 0)))}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="item-review-btn"
                              onClick={() => setSelectedItemForReview(item)}
                            >
                              Rate item
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <span className="price">
                      ₹{Number(item.totalPrice ?? (Number(item.unitPrice ?? item.price ?? 0) * item.quantity)).toFixed(0)}
                    </span>
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

      {showReviewModal && order && (
        <ReviewModal
          orderId={order.id}
          shopName={order.shopName}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}

      {selectedItemForReview && order && (
        <ItemReviewModal
          orderId={order.id}
          item={selectedItemForReview}
          onClose={() => setSelectedItemForReview(null)}
          onSubmit={handleItemReviewSubmit}
        />
      )}
    </div>
  );
};

export default OrderDetails;
