import React from 'react';
import { useNavigate } from 'react-router-dom';
import './card.css';
import {
  resolveShopImage,
  getShopCategoryCount,
  getShopStockCount,
  getShopStatusMeta,
  formatCount,
} from '../../utils/shopPresentation';

const RestaurantCard = ({ shop }) => {
  const navigate = useNavigate();
  const safeShop = shop || {};
  const title = safeShop.name || 'Restaurant';
  const image = resolveShopImage(safeShop);
  const city = safeShop.city;
  const categoryCount = getShopCategoryCount(safeShop);
  const stockCount = getShopStockCount(safeShop);
  const statusMeta = getShopStatusMeta(safeShop);
  const isClosed = statusMeta.isClosed;
  const initials = title ? title.charAt(0).toUpperCase() : '?';
  const formattedStock = stockCount !== null ? `${formatCount(stockCount)} dishes ready` : null;
  const description = safeShop.description || (categoryCount ? `${categoryCount} categories available` : null);
  const showMeta = categoryCount !== null || formattedStock;

  const handleClick = () => {
    if (isClosed) {
      return;
    }

    if (safeShop.id) {
      navigate(`/restaurant/shop/${safeShop.id}`);
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
      className={`restaurant-card${isClosed ? ' card-disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClosed ? -1 : 0}
      aria-disabled={isClosed}
    >
      <div className="restaurant-card-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="restaurant-card-placeholder">{initials}</div>
        )}
        {statusMeta.label && (
          <span className={`card-status ${isClosed ? 'closed' : 'open'}`}>{statusMeta.label}</span>
        )}
        {isClosed && <div className="card-closed-cover">Closed</div>}
      </div>
      <div className="restaurant-card-content">
        <h3 className="restaurant-card-title">{title}</h3>
        {description && <p className="restaurant-card-description">{description}</p>}
        {city && <p className="restaurant-card-location">{city}</p>}
        {showMeta && (
          <div className="card-meta">
            {categoryCount !== null && (
              <span className="card-meta-pill">
                {categoryCount === 1 ? '1 category' : `${categoryCount} categories`}
              </span>
            )}
            {formattedStock && <span className="card-meta-pill">{formattedStock}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantCard;