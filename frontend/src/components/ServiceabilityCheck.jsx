import React, { useState, useEffect } from 'react';
import { locationService } from '../services/location.service';
import './ServiceabilityCheck.css';

/**
 * ServiceabilityCheck Component
 * Checks if user location is within delivery zone
 * Displays message and controls shop visibility based on serviceability
 */
function ServiceabilityCheck({ onServiceabilityChange, children }) {
  const [serviceability, setServiceability] = useState({
    isChecked: false,
    isServiceable: false,
    distance: null,
    radiusKm: null,
    message: '',
    loading: false,
    error: null,
  });

  // Check serviceability on mount
  useEffect(() => {
    checkServiceability();
  }, []);

  const checkServiceability = async () => {
    setServiceability((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Try to get current location
      const location = await locationService.getCurrentLocation();

      // Check if serviceable
      const result = await locationService.checkServiceability(location.latitude, location.longitude);

      setServiceability({
        isChecked: true,
        isServiceable: result.isServiceable,
        distance: result.distance,
        radiusKm: result.radiusKm,
        message: result.message,
        loading: false,
        error: null,
      });

      // Notify parent component
      onServiceabilityChange?.(result.isServiceable);
    } catch (error) {
      console.error('Serviceability check error:', error);

      // If geolocation fails, try to use selected address
      handleLocationPermissionDenied();
    }
  };

  const handleLocationPermissionDenied = () => {
    setServiceability((prev) => ({
      ...prev,
      loading: false,
      error: error.message,
      isChecked: true,
      isServiceable: false,
    }));

    onServiceabilityChange?.(false);
  };

  const handleRetry = () => {
    checkServiceability();
  };

  const handleUseAddressInstead = () => {
    // This would be called when user selects a saved address
    // The parent component would then call checkServiceability with that address
  };

  // If serviceable, render children (shops)
  if (serviceability.isServiceable) {
    return (
      <div className="serviceability-wrapper">
        {children}
      </div>
    );
  }

  // If not serviceable, show error message
  return (
    <div className="serviceability-wrapper">
      <div className="serviceability-alert">
        {serviceability.loading ? (
          <div className="serviceability-loading">
            <div className="spinner"></div>
            <p>Checking your location...</p>
          </div>
        ) : (
          <>
            <div className="serviceability-icon">
              <span>📍</span>
            </div>
            <h3>Outside Delivery Area</h3>
            <p className="serviceability-message">
              {serviceability.message || 'Sorry, we don\'t deliver to your location at the moment.'}
            </p>
            {serviceability.distance && serviceability.radiusKm && (
              <p className="serviceability-distance">
                You are {serviceability.distance} km away. We deliver within {serviceability.radiusKm} km radius.
              </p>
            )}
            <div className="serviceability-actions">
              <button className="btn-retry" onClick={handleRetry}>
                🔄 Try Again
              </button>
              <button className="btn-address" onClick={handleUseAddressInstead}>
                📍 Select Address
              </button>
            </div>
            {serviceability.error && (
              <p className="serviceability-error-detail">{serviceability.error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ServiceabilityCheck;
