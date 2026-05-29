import React, { useState } from 'react';
import './ReviewModal.css';

const ItemReviewModal = ({ orderId, item, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        orderId,
        itemId: item?.itemId,
        rating,
        comment: comment.trim(),
      });
    } catch (err) {
      setError(err.message || 'Failed to submit item review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="review-modal-close" onClick={onClose} type="button">✕</button>

        <div className="review-modal-header">
          <h2>Rate this item</h2>
          <p>
            How was <strong>{item?.name || 'this item'}</strong>?
          </p>
        </div>

        <div className="review-modal-content">
          <div className="star-rating">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  type="button"
                  aria-label={`Rate ${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="rating-label">
              {rating > 0 ? ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1] : 'Tap to rate'}
            </p>
          </div>

          {/* Feedback textarea removed per UI request */}

          {error && <p className="error-message">{error}</p>}

          <div className="review-modal-actions">
            <button className="btn-skip" onClick={onClose} disabled={loading} type="button">
              Cancel
            </button>
            <button className="btn-submit" onClick={handleSubmit} disabled={loading || rating === 0} type="button">
              {loading ? 'Submitting...' : 'Submit Item Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemReviewModal;
