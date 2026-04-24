import { useState, useCallback, useEffect } from 'react';
import { locationService } from '../services/location.service';

/**
 * Custom hook for managing serviceability checks
 * Handles location detection and serviceability state management
 */
export function useServiceability() {
  const [serviceability, setServiceability] = useState({
    isChecked: false,
    isServiceable: false,
    distance: null,
    radiusKm: null,
    message: '',
    loading: false,
    error: null,
    location: null,
  });

  // Check serviceability with given coordinates
  const checkServiceability = useCallback(async (latitude, longitude) => {
    setServiceability((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await locationService.checkServiceability(latitude, longitude);
      locationService.setLocation(latitude, longitude);

      setServiceability({
        isChecked: true,
        isServiceable: result.isServiceable,
        distance: result.distance,
        radiusKm: result.radiusKm,
        message: result.message,
        loading: false,
        error: null,
        location: { latitude, longitude },
      });

      return result.isServiceable;
    } catch (error) {
      const errorMessage = error.message || 'Failed to check serviceability';
      setServiceability((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isChecked: true,
        isServiceable: false,
      }));
      throw error;
    }
  }, []);

  // Get current location and check serviceability
  const getCurrentLocation = useCallback(async () => {
    setServiceability((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const location = await locationService.getCurrentLocation();
      const result = await locationService.checkServiceability(location.latitude, location.longitude);

      setServiceability({
        isChecked: true,
        isServiceable: result.isServiceable,
        distance: result.distance,
        radiusKm: result.radiusKm,
        message: result.message,
        loading: false,
        error: null,
        location: { latitude: location.latitude, longitude: location.longitude },
      });

      return result.isServiceable;
    } catch (error) {
      const errorMessage = error.message || 'Failed to get location';
      setServiceability((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isChecked: true,
        isServiceable: false,
      }));
      throw error;
    }
  }, []);

  // Get serviceable shops
  const getServiceableShops = useCallback(
    async (businessType = null, page = 1, pageSize = 10) => {
      try {
        const result = await locationService.getServiceableShops(businessType, page, pageSize);
        return result;
      } catch (error) {
        console.error('Error fetching serviceable shops:', error);
        throw error;
      }
    },
    []
  );

  // Reset serviceability state
  const reset = useCallback(() => {
    setServiceability({
      isChecked: false,
      isServiceable: false,
      distance: null,
      radiusKm: null,
      message: '',
      loading: false,
      error: null,
      location: null,
    });
    locationService.clearLocation();
  }, []);

  return {
    ...serviceability,
    checkServiceability,
    getCurrentLocation,
    getServiceableShops,
    reset,
  };
}

export default useServiceability;
