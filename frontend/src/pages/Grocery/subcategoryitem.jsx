import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import GroceryItemCard from './itemcard';
import EmptyState from '../../components/common/EmptyState';
import './subcategoryitem.css';
import { getCategoryWithDetails } from '../../services/category.service.js';

const getGroupKey = (group) => (group?.subcategory_id ?? 'no-subcategory');

const SubCategoryItem = () => {
  const { shopId, categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackCategoryName = location.state?.categoryName || 'Items';

  const [categoryDetails, setCategoryDetails] = useState(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const details = await getCategoryWithDetails(categoryId, shopId);

        if (!isMounted) {
          return;
        }

        setCategoryDetails(details);
      } catch (fetchError) {
        console.error('Failed to load category items', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Unable to fetch items right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategoryDetails();

    return () => {
      isMounted = false;
    };
  }, [categoryId, shopId, reloadKey]);

  const groups = useMemo(() => categoryDetails?.grouped_items || [], [categoryDetails]);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupKey(null);
      return;
    }

    const defaultGroup = groups.find((group) => (group.items?.length || 0) > 0) || groups[0];
    setSelectedGroupKey(getGroupKey(defaultGroup));
  }, [groups]);

  const selectedGroup = groups.find((group) => getGroupKey(group) === selectedGroupKey);
  const items = selectedGroup?.items || [];

  const showSidebar = groups.length > 1 || groups.some((group) => group.subcategory_id !== null);
  const displayName = selectedGroup?.subcategory_name || categoryDetails?.category?.name || fallbackCategoryName;
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || '#';
  const displayCount = selectedGroup ? selectedGroup.items?.length || 0 : categoryDetails?.total_items || 0;

  return (
    <div className="subcategory-item-page">
      {/* Header */}
      <div className="subcategory-item-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="header-info">
          <div className="category-icon-header">{displayInitial}</div>
          <div>
            <h1 className="category-title">{displayName}</h1>
            <p className="category-subtitle">{displayCount} items</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="subcategory-item-content">
        {showSidebar && (
          <div className="subcategory-item-sidebar">
            {groups.map((group) => {
              const key = getGroupKey(group);
              const name = group.subcategory_name || 'Other Items';
              const icon = group.subcategory_name?.charAt(0)?.toUpperCase() || '#';
              const isActive = key === selectedGroupKey;

              return (
                <div
                  key={key}
                  className={`subcategory-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedGroupKey(key)}
                >
                  {group.image_url ? (
                    <img
                      src={group.image_url}
                      alt={name}
                      loading="lazy"
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="subcategory-icon">{icon}</div>
                  )}
                  <span className="subcategory-name-text">{name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Items Grid */}
        <div className="items-container">
          {loading && <p>Loading items...</p>}

          {!loading && error && (
            <EmptyState
              title="We couldn't load items"
              description={error}
              actionLabel="Retry"
              onAction={() => setReloadKey((prev) => prev + 1)}
            />
          )}

          {!loading && !error && items.length === 0 && (
            <EmptyState
              title="No items found"
              description="This category does not have any items yet."
            />
          )}

          {!loading && !error && items.length > 0 && (
            <div className="items-grid">
              {items.map((item) => {
                const numericStock = Number(item?.stock_quantity);
                const stockValue = Number.isFinite(numericStock) ? numericStock : null;
                const stockLabel = stockValue !== null ? `${stockValue} in stock` : null;
                const halfPortionPrice = item?.half_portion_price;
                const fullPortionPrice = item?.full_price ?? item?.price;

                return (
                  <GroceryItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    price={item.price}
                    halfPortionPrice={halfPortionPrice}
                    fullPortionPrice={fullPortionPrice}
                    isVeg={item.is_veg}
                    isAvailable={item.is_available !== false}
                    description={item.description}
                    stockQuantityLabel={stockLabel}
                    stockQuantityValue={stockValue}
                    image={item.image_url}
                    shopId={shopId}
                    shopType="grocery"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubCategoryItem;