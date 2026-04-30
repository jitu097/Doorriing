import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ItemCard from './itemcard';
import EmptyState from '../../components/common/EmptyState';
import './subcategory.css';
import { getCategoryWithDetails } from '../../services/category.service.js';
import { formatCount } from '../../utils/shopPresentation';
import { computeFinalPrice } from '../../utils/pricing';

const getGroupKey = (group) => (group?.subcategory_id ?? 'no-subcategory');

const SubCategory = () => {
  const { restaurantId, categoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackCategoryName = location.state?.categoryName || 'Menu Items';

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
        const details = await getCategoryWithDetails(categoryId, restaurantId);

        if (!isMounted) {
          return;
        }

        setCategoryDetails(details);
      } catch (fetchError) {
        console.error('Failed to load restaurant items', fetchError);
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
  }, [categoryId, restaurantId, reloadKey]);

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
    <div className="subcategory-page">
      {/* Header */}
      <div className="subcategory-header">
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
      <div className="subcategory-content">
        {showSidebar && (
          <div className="subcategory-sidebar">
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
                  <div className="subcategory-name">{name}</div>
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
                const formattedStockValue = stockValue > 0 ? formatCount(stockValue) : null;
                const stockLabel = formattedStockValue ? `${formattedStockValue} items` : null;

                const foodType = (item?.food_type || '').toLowerCase();

                // Variant detection: an item has Half/Full variants when half_portion_price
                // is set (non-null). This is the same signal ItemCard uses internally
                // (hasHalfVariant) so the two always agree — regardless of the has_variants flag.
                const hasHalfPrice = item?.half_portion_price != null;

                // --- PRICE RESOLUTION ---
                // For restaurant items the seller always sets up pricing via the
                // full_price / full_final_price / full_discount_* columns.
                // The plain price/final_price columns may contain stale or
                // differently-discounted values — never mix them with full_* columns.

                // Original (MRP) price
                const baseOriginalPrice = hasHalfPrice
                  ? (item?.full_price ?? item?.price ?? null)   // variant → full portion
                  : (item?.full_price ?? item?.price ?? null);  // simple  → same priority

                // Final (selling) price for the full portion / single price
                const baseFinalPrice = hasHalfPrice
                  ? (
                      // Variant item: use ONLY full_* discount chain
                      item?.full_final_price ??
                      computeFinalPrice(baseOriginalPrice, item?.full_discount_type, item?.full_discount_value) ??
                      baseOriginalPrice
                    )
                  : item?.full_price != null
                    ? (
                        // Simple item that still uses full_price → use full_* chain
                        item?.full_final_price ??
                        computeFinalPrice(item?.full_price, item?.full_discount_type, item?.full_discount_value) ??
                        item?.full_price
                      )
                    : (
                        // Simple item with only price field → use plain chain
                        item?.final_price ??
                        computeFinalPrice(item?.price, item?.discount_type, item?.discount_value) ??
                        item?.price ??
                        null
                      );

                // Safe price — skip ₹0 when original is clearly non-zero
                // (protects against stale full_final_price=0 or wrong discount in DB)
                const rawSafePrice = baseFinalPrice ?? baseOriginalPrice ?? 0;
                const safePrice = (Number(rawSafePrice) > 0)
                  ? rawSafePrice
                  : (Number(baseOriginalPrice) > 0 ? baseOriginalPrice : rawSafePrice);

                // Half portion props — only meaningful for variant items
                const halfPortionOriginalPrice = hasHalfPrice ? (item?.half_portion_price ?? null) : null;
                const halfPortionFinalPrice = hasHalfPrice
                  ? (
                      item?.half_portion_final_price ??
                      computeFinalPrice(halfPortionOriginalPrice, item?.half_discount_type, item?.half_discount_value) ??
                      halfPortionOriginalPrice
                    )
                  : null;

                // Full portion props — only pass for variant items
                const fullPortionPrice = hasHalfPrice ? baseOriginalPrice : null;
                const fullPortionFinalPrice = hasHalfPrice ? baseFinalPrice : null;

                const derivedIsVeg = foodType === 'nonveg' ? false : true;

                return (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    price={safePrice}
                    originalPrice={baseOriginalPrice}
                    halfPortionPrice={halfPortionOriginalPrice}
                    halfPortionFinalPrice={halfPortionFinalPrice}
                    fullPortionPrice={fullPortionPrice}
                    fullPortionFinalPrice={fullPortionFinalPrice}
                    foodType={foodType}
                    isVeg={derivedIsVeg}
                    isAvailable={item.is_available !== false}
                    description={item.description}
                    stockQuantityLabel={stockLabel}
                    stockQuantityValue={stockValue}
                    image={item.image_url}
                    shopId={restaurantId}
                    shopType="restaurant"
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

export default SubCategory;