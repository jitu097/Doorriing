/**
 * EXAMPLE: How to integrate delivery zone check in your existing Home page
 * Copy this code and adapt it to your Home.jsx or Browse.jsx
 */

import React, { useState, useEffect } from 'react';
import useServiceability from '../hooks/useServiceability';
import ShopCard from '../components/ShopCard'; // Your existing shop card
import LoadingSpinner from '../components/LoadingSpinner'; // Your loading component

/**
 * Example 1: Using the useServiceability Hook
 * This is the recommended approach for maximum control
 */
export function HomePageWithServiceability() {
  const {
    isServiceable,
    loading,
    error,
    message,
    distance,
    radiusKm,
    getCurrentLocation,
    getServiceableShops,
    reset,
  } = useServiceability();

  const [shops, setShops] = useState({
    grocery: [],
    restaurant: [],
  });
  const [loadingShops, setLoadingShops] = useState(false);

  // Initialize on component mount
  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  // Fetch serviceable shops when serviceability is confirmed
  useEffect(() => {
    if (isServiceable && !loadingShops) {
      fetchServiceableShops();
    }
  }, [isServiceable]);

  const fetchServiceableShops = async () => {
    setLoadingShops(true);
    try {
      // Fetch grocery shops
      const groceryResult = await getServiceableShops('grocery');
      // Fetch restaurant shops
      const restaurantResult = await getServiceableShops('restaurant');

      setShops({
        grocery: groceryResult.shops || [],
        restaurant: restaurantResult.shops || [],
      });
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  const handleRetry = async () => {
    reset();
    await initializeLocation();
  };

  // Loading state
  if (loading) {
    return (
      <div className="home-page">
        <LoadingSpinner message="Checking your location..." />
      </div>
    );
  }

  // Error state
  if (error && !isServiceable) {
    return (
      <div className="home-page">
        <div className="serviceability-error-container">
          <div className="error-icon">📍</div>
          <h2>Unable to Determine Location</h2>
          <p>{error}</p>
          <p className="error-help">
            Please enable location access in your browser settings to proceed.
          </p>
          <button className="btn-retry" onClick={handleRetry}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Outside service area state
  if (!isServiceable) {
    return (
      <div className="home-page">
        <div className="not-serviceable-container">
          <div className="error-icon">📍</div>
          <h2>Outside Delivery Area</h2>
          <p className="main-message">{message}</p>
          {distance && radiusKm && (
            <p className="distance-info">
              You are <strong>{distance} km</strong> away. We deliver within{' '}
              <strong>{radiusKm} km</strong> radius from our center.
            </p>
          )}
          <button className="btn-retry" onClick={handleRetry}>
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  // Inside service area - show shops
  return (
    <div className="home-page">
      {/* Location Badge */}
      <div className="location-status-badge">
        <span className="location-icon">✓</span>
        <span className="location-text">You are within our delivery area</span>
        <span className="distance-text">({distance} km away)</span>
      </div>

      {/* Grocery Section */}
      <section className="shop-section">
        <h2 className="section-title">🛒 Grocery Stores</h2>
        {loadingShops ? (
          <LoadingSpinner message="Loading grocery stores..." />
        ) : shops.grocery.length > 0 ? (
          <div className="shops-grid">
            {shops.grocery.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <EmptyState message="No grocery stores available in your area" />
        )}
      </section>

      {/* Restaurant Section */}
      <section className="shop-section">
        <h2 className="section-title">🍽️ Restaurants</h2>
        {loadingShops ? (
          <LoadingSpinner message="Loading restaurants..." />
        ) : shops.restaurant.length > 0 ? (
          <div className="shops-grid">
            {shops.restaurant.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <EmptyState message="No restaurants available in your area" />
        )}
      </section>
    </div>
  );
}

/**
 * Example 2: Using the ServiceabilityCheck Component Wrapper
 * This is simpler but gives you less control over the flow
 */

import ServiceabilityCheck from '../components/ServiceabilityCheck';

export function HomePageSimplified() {
  const [shops, setShops] = useState({
    grocery: [],
    restaurant: [],
  });
  const [isServiceable, setIsServiceable] = useState(false);

  useEffect(() => {
    if (isServiceable) {
      loadShops();
    }
  }, [isServiceable]);

  const loadShops = async () => {
    // Load shops based on location stored in locationService
    // See implementation guide for details
  };

  return (
    <div className="home-page">
      <ServiceabilityCheck onServiceabilityChange={setIsServiceable}>
        {isServiceable && (
          <div>
            <section className="shop-section">
              <h2>Grocery Stores</h2>
              <ShopsGrid shops={shops.grocery} />
            </section>

            <section className="shop-section">
              <h2>Restaurants</h2>
              <ShopsGrid shops={shops.restaurant} />
            </section>
          </div>
        )}
      </ServiceabilityCheck>
    </div>
  );
}

/**
 * Example 3: Browse Page Integration
 * For shop listing pages with business type filter
 */

export function BrowsePage({ businessType }) {
  const {
    isServiceable,
    loading,
    error,
    getCurrentLocation,
    getServiceableShops,
    reset,
  } = useServiceability();

  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);

  useEffect(() => {
    checkLocationAndLoadShops();
  }, [businessType]);

  const checkLocationAndLoadShops = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  useEffect(() => {
    if (isServiceable) {
      loadShopsForCategory();
    }
  }, [isServiceable, businessType]);

  const loadShopsForCategory = async () => {
    setLoadingShops(true);
    try {
      const result = await getServiceableShops(businessType);
      setShops(result.shops || []);
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Checking your location..." />;
  }

  if (!isServiceable) {
    return (
      <div className="browse-error-container">
        <h2>Not Available in Your Area</h2>
        <p>{error || 'We don\'t deliver to your location yet.'}</p>
        <button onClick={() => reset()}>Try Different Location</button>
      </div>
    );
  }

  return (
    <div className="browse-page">
      <h1>
        {businessType === 'grocery' ? 'Grocery Stores' : 'Restaurants'}
      </h1>

      {loadingShops ? (
        <LoadingSpinner message={`Loading ${businessType}...`} />
      ) : shops.length > 0 ? (
        <div className="shops-list">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <EmptyState
          message={`No ${businessType} available in your area`}
        />
      )}
    </div>
  );
}

/**
 * CSS Additions for Home Page
 * Add these to your Home.css or create ServiceabilityIntegration.css
 */

/*
.location-status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border: 1px solid #b1dfbb;
  border-radius: 8px;
  color: #155724;
  font-weight: 500;
  text-align: center;
}

.location-icon {
  font-size: 1.2rem;
}

.location-text {
  flex: 1;
}

.distance-text {
  font-size: 0.9rem;
  color: #0d6720;
  font-weight: 600;
}

.not-serviceable-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 2rem auto;
  max-width: 500px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.not-serviceable-container h2 {
  color: #ff6b6b;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.main-message {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.distance-info {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  color: #856404;
}

.btn-retry {
  padding: 0.75rem 2rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-retry:hover {
  background: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.shop-section {
  margin: 2rem 0;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #333;
}

.shops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}
*/

export default HomePageWithServiceability;
