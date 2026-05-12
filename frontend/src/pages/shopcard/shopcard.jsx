import React from 'react';
import { useNavigate } from 'react-router-dom';
import './shopcard.css';
import {
  resolveShopImage,
  getShopCategoryCount,
  getShopRatingSummary,
  formatCount,
  getShopStatusMeta,
} from '../../utils/shopPresentation';

const ShopCard = ({ shop, routePrefix = 'grocery' }) => {
  const navigate = useNavigate();
  const safeShop = shop || {};
  const title = safeShop.name || 'Shop';
  const image = resolveShopImage(safeShop);
  const city = safeShop.city;
  const categoryCount = getShopCategoryCount(safeShop);
  const ratingSummary = getShopRatingSummary(safeShop);
  const roundedStars = ratingSummary.hasRating ? Math.round(ratingSummary.average) : 0;
  const statusMeta = getShopStatusMeta(safeShop);
  const isClosed = statusMeta.isClosed;
  const initials = title ? title.charAt(0).toUpperCase() : '?';
  const description = safeShop.description || (categoryCount ? `${categoryCount} categories available` : null);
  const showMeta = categoryCount !== null || ratingSummary.hasRating;

  const handleClick = () => {
    if (isClosed) {
      return;
    }

    if (safeShop.id) {
      navigate(`/${routePrefix}/shop/${safeShop.id}`);
    }
  };

  const handleKeyDown = (event) => {
    if (isClosed) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`shop-card${isClosed ? ' card-disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClosed ? -1 : 0}
      aria-disabled={isClosed}
    >
      <div className="shop-card-image">
        {image ? (
          <img src={image} alt={title} loading="lazy" />
        ) : (
          <div className="shop-card-placeholder">{initials}</div>
        )}
        {statusMeta.label && (
          <span className={`card-status ${isClosed ? 'closed' : 'open'}`}>{statusMeta.label}</span>
        )}
        {isClosed && <div className="card-closed-cover">Closed</div>}
      </div>
      <div className="shop-card-content">
        <h3 className="shop-card-title">{title}</h3>
        {description && <p className="shop-card-description">{description}</p>}
        {city && <p className="shop-card-location">{city}</p>}
        {showMeta && (
          <div className="card-meta">
            {ratingSummary.hasRating && (
              <span className="card-meta-pill card-meta-pill-rating" aria-label={`Rated ${ratingSummary.average} out of 5 from ${ratingSummary.count} reviews`}>
                <span className="rating-stars" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className={`rating-star-icon ${index < roundedStars ? 'filled' : 'empty'}`}
                    >
                      ★
                    </span>
                  ))}
                </span>
                <span className="rating-value">{ratingSummary.average.toFixed(1)}</span>
                <span className="rating-count">({formatCount(ratingSummary.count)})</span>
              </span>
            )}
            {categoryCount !== null && (
              <span className="card-meta-pill">
                {categoryCount === 1 ? '1 category' : `${categoryCount} categories`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(ShopCard);
