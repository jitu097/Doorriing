import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './shopcard.css';
import { prefetchShop } from '../../utils/prefetchManager';
import {
  resolveShopImage,
  getShopCategoryCount,
  getShopRatingSummary,
  formatCount,
  getShopStatusMeta,
} from '../../utils/shopPresentation';

const STARS_ARRAY = [0, 1, 2, 3, 4];

const optimizeCloudinaryUrl = (url, width = 300) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  if (url.includes('upload/c_') || url.includes('upload/f_') || url.includes('upload/q_')) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${width},f_webp,q_auto/`);
};

const ShopCard = ({ shop, routePrefix = 'grocery' }) => {
  const navigate = useNavigate();
  const safeShop = shop || {};
  const title = safeShop.name || 'Shop';
  const image = resolveShopImage(safeShop);
  const optimizedImage = useMemo(() => optimizeCloudinaryUrl(image, 300), [image]);
  const city = safeShop.city;
  const initials = title ? title.charAt(0).toUpperCase() : '?';

  // ── Memoized presentation utility calls ──────────────────────────────────
  const shopMeta = useMemo(() => {
    const categoryCount = getShopCategoryCount(safeShop);
    const ratingSummary = getShopRatingSummary(safeShop);
    const roundedStars = ratingSummary.hasRating ? Math.round(ratingSummary.average) : 0;
    const statusMeta = getShopStatusMeta(safeShop);
    const description = safeShop.description || (categoryCount ? `${categoryCount} categories available` : null);
    const showMeta = categoryCount !== null || ratingSummary.hasRating;

    return {
      categoryCount,
      ratingSummary,
      roundedStars,
      statusMeta,
      description,
      showMeta,
    };
  }, [safeShop]);

  const {
    categoryCount,
    ratingSummary,
    roundedStars,
    statusMeta,
    description,
    showMeta,
  } = shopMeta;

  const isClosed = statusMeta.isClosed;

  const prefetchTimeoutRef = useRef(null);

  const triggerPrefetch = useCallback(() => {
    if (isClosed || !safeShop.id) return;
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchShop(safeShop.id);
    }, 100);
  }, [isClosed, safeShop.id]);

  const cancelPrefetch = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (isClosed) {
      return;
    }

    if (safeShop.id) {
      navigate(`/${routePrefix}/shop/${safeShop.id}`);
    }
  }, [isClosed, safeShop.id, routePrefix, navigate]);

  const handleKeyDown = useCallback((event) => {
    if (isClosed) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [isClosed, handleClick]);

  return (
    <div
      className={`shop-card${isClosed ? ' card-disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={triggerPrefetch}
      onMouseLeave={cancelPrefetch}
      onTouchStart={triggerPrefetch}
      role="button"
      tabIndex={isClosed ? -1 : 0}
      aria-disabled={isClosed}
    >
      <div className="shop-card-image" style={{ aspectRatio: '16/10', height: 'auto', overflow: 'hidden' }}>
        {optimizedImage ? (
          <img src={optimizedImage} alt={title} loading="lazy" decoding="async" fetchPriority="low" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  {STARS_ARRAY.map((index) => (
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

export default React.memo(ShopCard);
