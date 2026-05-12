import React, { useState } from 'react';
import './ReviewModal.css';

const ReviewModal = ({ orderId, shopName, onClose, onSubmit }) => {
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
        rating,
        comment: comment.trim(),
      });
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="review-modal-overlay" onClick={handleSkip}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="review-modal-close" onClick={handleSkip}>✕</button>

        <div className="review-modal-header">
          <h2>How was your experience?</h2>
          <p>Help us improve by sharing your feedback on <strong>{shopName}</strong></p>
        </div>

        <div className="review-modal-content">
          {/* Star Rating */}
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

          {/* Comment Section */}
          <div className="comment-section">
            <label htmlFor="comment">Additional feedback (optional)</label>
            <textarea
              id="comment"
              className="comment-input"
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="char-count">{comment.length}/500</p>
          </div>

          {/* Error Message */}
          {error && <p className="error-message">{error}</p>}

          {/* Buttons */}
          <div className="review-modal-actions">
            <button
              className="btn-skip"
              onClick={handleSkip}
              disabled={loading}
              type="button"
            >
              Skip
            </button>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              type="button"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
