import React, { useEffect, useMemo, useState } from 'react';
import './Grocery.css';
import ShopCard from '../shopcard/shopcard';
import EmptyState from '../../components/common/EmptyState';
import { getShopsByBusinessType } from '../../services/shop.service.js';

const carouselImages = [
  '/vegetables.jpg',
  '/fruit.png',
  '/third.png'
];

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-scroll carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

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
        <div className="carousel-container">
          <div className="carousel-track" style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}>
            {carouselImages.map((image, index) => (
              <div key={index} className="carousel-slide">
                <img src={image} alt={`Slide ${index + 1}`} className="carousel-image" />
              </div>
            ))}
          </div>
          <div className="carousel-dots">
            {carouselImages.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Wrapper with Sidebar */}
      <div className="grocery-main-wrapper">
        {/* Category Sidebar */}
        <aside className="category-sidebar">
          <h3 className="category-sidebar-title">Categories</h3>
          <div className="category-list">
            {filters.map((category) => {
              const displayText = category === 'All' ? 'ALL' : category;
              return (
                <button
                  key={category}
                  className={`category-btn ${selectedFilter === category ? 'active' : ''} ${category === 'All' ? 'all-btn' : ''}`}
                  onClick={() => setSelectedFilter(category)}
                >
                  <span className="category-name">{displayText}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
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
    </div>
  );
};

export default Grocery;
