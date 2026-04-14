import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './card.css';
import {
  resolveShopImage,
  getShopCategoryCount,
  getShopStockCount,
  getShopStatusMeta,
  formatCount,
} from '../../utils/shopPresentation';
import TableBooking from '../Restaurant/TableBooking';

const RestaurantCard = ({ shop }) => {
  const navigate = useNavigate();
  const [showTableBooking, setShowTableBooking] = useState(false);
  const safeShop = shop || {};
  const title = safeShop.name || 'Restaurant';
  const image = resolveShopImage(safeShop);
  const city = safeShop.city;
  const categoryCount = getShopCategoryCount(safeShop);
  const stockCount = getShopStockCount(safeShop);
  const statusMeta = getShopStatusMeta(safeShop);
  const isClosed = statusMeta.isClosed;
  const initials = title ? title.charAt(0).toUpperCase() : '?';
  const hasItemCount = stockCount !== null && Number(stockCount) > 0;
  const formattedStock = hasItemCount ? `${formatCount(stockCount)} items` : null;
  const description = safeShop.description || (categoryCount ? `${categoryCount} categories available` : null);
  const showMeta = categoryCount !== null || formattedStock;
  
  // Check if booking is enabled for this restaurant
  const isBookingEnabled = safeShop.is_booking_enabled === true;
  const isRestaurant = safeShop.business_type === 'restaurant';
  const showBookingButton = !isClosed && isRestaurant && isBookingEnabled;



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

  const handleTableBooking = (e) => {
    e.stopPropagation();
    setShowTableBooking(true);
  };

  return (
    <>
      <TableBooking 
        isOpen={showTableBooking}
        onClose={() => setShowTableBooking(false)}
        restaurant={safeShop}
      />
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
                  <img src={image} alt={title} loading="lazy" />
          ) : (
            <div className="restaurant-card-placeholder">{initials}</div>
          )}
          {statusMeta.label && (
            <span className={`card-status ${isClosed ? 'closed' : 'open'}`}>{statusMeta.label}</span>
          )}
          {isClosed && <div className="card-closed-cover">Closed</div>}
          {showBookingButton && (
            <div className="card-booking-actions">
              <button 
                className="btn-book-table" 
                onClick={handleTableBooking}
                aria-label="Reserve a table"
              >
                🍽️ Reserve Table
              </button>
            </div>
          )}
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
    </>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(RestaurantCard);