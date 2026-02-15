import React, { useEffect, useMemo, useState } from 'react';
import './Grocery.css';
import ShopCard from '../shopcard/shopcard';
import EmptyState from '../../components/common/EmptyState';
import { getShopsByBusinessType } from '../../services/shop.service.js';

const parseShopSubcategories = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }

        if (entry == null) {
          return '';
        }

        return String(entry).trim();
      })
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const collectUniqueSubcategories = (shops) => {
  const unique = new Map();

  (shops || []).forEach((shop) => {
    const rawSource = shop?.subcategories ?? shop?.shop_subcategories ?? shop?.subcategory;
    parseShopSubcategories(rawSource).forEach((subcategory) => {
      const key = subcategory.toLowerCase();

      if (!unique.has(key)) {
        unique.set(key, subcategory);
      }
    });
  });

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

const Grocery = () => {
  const [shops, setShops] = useState([]);
  const [filters, setFilters] = useState(['All']);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchShops = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getShopsByBusinessType('grocery');
        if (!isMounted) {
          return;
        }

        const fetchedShops = result.shops || [];
        setShops(fetchedShops);

        const uniqueSubcategories = collectUniqueSubcategories(fetchedShops);

        setFilters(['All', ...uniqueSubcategories]);

        setSelectedFilter((previous) => {
          if (previous === 'All') {
            return previous;
          }

          const normalizedPrevious = previous.toLowerCase();
          return uniqueSubcategories.some((subcategory) => subcategory.toLowerCase() === normalizedPrevious) ? previous : 'All';
        });
      } catch (fetchError) {
        console.error('Failed to load grocery shops', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Unable to fetch shops right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchShops();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const filteredShops = useMemo(() => {
    if (selectedFilter === 'All') {
      return shops;
    }

    const selectedNormalized = selectedFilter.toLowerCase();

    return shops.filter((shop) => {
      const rawSource = shop?.subcategories ?? shop?.shop_subcategories ?? shop?.subcategory;
      return parseShopSubcategories(rawSource).some((subcategory) => subcategory.toLowerCase() === selectedNormalized);
    });
  }, [shops, selectedFilter]);

  return (
    <div>
      <div className="grocery-curve-bg">
        <div className="grocery-content">
          <h2>Grocery Section</h2>
          <p>All your daily needs in one place!</p>
        </div>
      </div>

      {/* Category Scroller */}
      <div className="category-scroller-container">
        <div className="category-scroller">
          {filters.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedFilter === category ? 'active' : ''}`}
              onClick={() => setSelectedFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grocery-shops-container">
        {loading && <p>Loading shops...</p>}

        {!loading && error && (
          <EmptyState
            title="We couldn't load shops"
            description={error}
            actionLabel="Retry"
            onAction={() => {
              setSelectedFilter('All');
              setReloadKey((prev) => prev + 1);
            }}
          />
        )}

        {!loading && !error && filteredShops.length === 0 && (
          <EmptyState
            title="No shops found"
            description={selectedFilter === 'All' ? 'No grocery shops are available right now.' : `No shops found in ${selectedFilter}.`}
          />
        )}

        {!loading && !error && filteredShops.length > 0 && (
          <div className="grocery-shops-grid">
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                id={shop.id}
                image={shop.image_url}
                title={shop.name}
                description={shop.category_count ? `${shop.category_count} categories available` : shop.description}
                city={shop.city}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Grocery;
