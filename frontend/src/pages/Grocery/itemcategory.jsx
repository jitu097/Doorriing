import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './itemcategory.css';
import EmptyState from '../../components/common/EmptyState';
import { getShopById } from '../../services/shop.service.js';
import { getCategoriesByShop } from '../../services/category.service.js';

const ItemCategory = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadShopData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [shopDetails, categoryList] = await Promise.all([
          getShopById(shopId),
          getCategoriesByShop(shopId),
        ]);

        if (!isMounted) {
          return;
        }

        setShop(shopDetails);
        setCategories(categoryList || []);
      } catch (fetchError) {
        console.error('Failed to load shop categories', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Unable to fetch categories right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadShopData();

    return () => {
      isMounted = false;
    };
  }, [shopId, reloadKey]);

  const cardColors = useMemo(
    () => ['#FFF9E6', '#FFE6E6', '#FFF0E6', '#E6F7E6', '#FFE6F0', '#E6F3FF', '#FFF5E6', '#F0E6FF'],
    []
  );

  const handleCategoryClick = (category) => {
    navigate(`/grocery/shop/${shopId}/category/${category.id}`, {
      state: { categoryName: category.name },
    });
  };

  const infoLocation = shop?.address || shop?.city;
  const isActive = shop?.is_active !== false;

  return (
    <div className="item-category-page">
      {/* Header */}
      <div className="shop-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="shop-name">{shop?.name || 'Shop'}</h1>
        <div className="header-actions">
          <button className="icon-button" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12H20M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-button" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Shop Info */}
      <div className="shop-info">
        {shop?.description && (
          <div className="info-row">
            <span className="delivery-info">{shop.description}</span>
          </div>
        )}
        {infoLocation && (
          <div className="info-row">
            <span className="location">
              <span className="icon">📍</span>
              {infoLocation}
            </span>
          </div>
        )}

        {/* Status Banner */}
        <div className="status-banner">
          <div className="banner-content">
            <span className="banner-icon">{isActive ? '✅' : '🔒'}</span>
            <div className="banner-text">
              <strong>{isActive ? 'OPEN FOR ORDERS' : 'SHUTTER IS DOWN'}</strong>
              <p>{isActive ? 'The shop is accepting orders right now.' : 'The outlet will open in the next available slot.'}</p>
            </div>
            <button className="see-slots-btn" type="button" disabled>
              SEE SLOTS
            </button>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="menu-section">
        <h2 className="menu-title">MENU</h2>
        {loading && <p>Loading categories...</p>}

        {!loading && error && (
          <EmptyState
            title="We couldn't load categories"
            description={error}
            actionLabel="Retry"
            onAction={() => setReloadKey((prev) => prev + 1)}
          />
        )}

        {!loading && !error && categories.length === 0 && (
          <EmptyState
            title="No categories available"
            description="This shop has not published any categories yet."
          />
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="categories-grid">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="category-card"
                style={{ backgroundColor: cardColors[index % cardColors.length] }}
                onClick={() => handleCategoryClick(category)}
              >
                <div className="category-icon">
                  {category.name?.charAt(0)?.toUpperCase() || '#'}
                </div>
                <p className="category-name">{category.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="footer-note">
        <p>An average active adult typically requires around 2000 kcal of energy per day, though individual calorie needs may vary.</p>
      </div>
    </div>
  );
};

export default ItemCategory;