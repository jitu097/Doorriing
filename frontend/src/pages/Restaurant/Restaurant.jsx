import React, { useEffect, useMemo, useState } from 'react';
import './Restaurant.css';
import RestaurantCard from '../Restaurantcard/card';
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

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filters, setFilters] = useState(['All']);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getShopsByBusinessType('restaurant');

        if (!isMounted) {
          return;
        }

        const fetchedRestaurants = result.shops || [];
        setRestaurants(fetchedRestaurants);

        const uniqueSubcategories = collectUniqueSubcategories(fetchedRestaurants);

        setFilters(['All', ...uniqueSubcategories]);

        setSelectedFilter((previous) => {
          if (previous === 'All') {
            return previous;
          }

          const normalizedPrevious = previous.toLowerCase();
          return uniqueSubcategories.some((subcategory) => subcategory.toLowerCase() === normalizedPrevious) ? previous : 'All';
        });
      } catch (fetchError) {
        console.error('Failed to load restaurant shops', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Unable to fetch restaurants right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRestaurants();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const filteredRestaurants = useMemo(() => {
    if (selectedFilter === 'All') {
      return restaurants;
    }

    const selectedNormalized = selectedFilter.toLowerCase();

    return restaurants.filter((restaurant) => {
      const rawSource = restaurant?.subcategories ?? restaurant?.shop_subcategories ?? restaurant?.subcategory;
      return parseShopSubcategories(rawSource).some((subcategory) => subcategory.toLowerCase() === selectedNormalized);
    });
  }, [restaurants, selectedFilter]);

  return (
    <div>
      <div className="restaurant-curve-bg">
        <div className="restaurant-content">
          <h2>Restaurant Section</h2>
          <p>Order delicious food from your favorite restaurants!</p>
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
      
      <div className="restaurant-cards-container">
        {loading && <p>Loading restaurants...</p>}

        {!loading && error && (
          <EmptyState
            title="We couldn't load restaurants"
            description={error}
            actionLabel="Retry"
            onAction={() => {
              setSelectedFilter('All');
              setReloadKey((prev) => prev + 1);
            }}
          />
        )}

        {!loading && !error && filteredRestaurants.length === 0 && (
          <EmptyState
            title="No restaurants found"
            description={selectedFilter === 'All' ? 'No restaurants are available right now.' : `No restaurants found in ${selectedFilter}.`}
          />
        )}

        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="restaurant-cards-grid">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                image={restaurant.image_url}
                title={restaurant.name}
                description={restaurant.category_count ? `${restaurant.category_count} categories available` : restaurant.description}
                city={restaurant.city}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurant;
