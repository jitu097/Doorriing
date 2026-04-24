import { api } from './api';

/**
 * Location Service
 * Handles user location detection and serviceability checks
 */
class LocationService {
  constructor() {
    this.currentLocation = null;
    this.zoneConfig = null;
  }

  /**
   * Get user's current location using browser geolocation
   * Returns: { latitude, longitude, accuracy, timestamp }
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          this.currentLocation = { latitude, longitude, accuracy, timestamp: Date.now() };
          resolve(this.currentLocation);
        },
        (error) => {
          const errorMessages = {
            1: 'Location permission denied. Please enable location access in your browser settings.',
            2: 'Unable to retrieve your location. Please try again.',
            3: 'Location request timed out. Please try again.',
          };
          reject(new Error(errorMessages[error.code] || 'Error getting location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Check if a location is serviceable (within delivery zone)
   * Takes latitude and longitude
   * Returns: { isServiceable: boolean, distance: number, message: string, radiusKm: number }
   */
  async checkServiceability(latitude, longitude) {
    try {
      const response = await api.post('/delivery-zone/check-serviceability', {
        latitude,
        longitude,
      });

      return response.data;
    } catch (error) {
      console.error('Serviceability check error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check service area');
    }
  }

  /**
   * Check serviceability using query params (alternative method)
   */
  async checkServiceabilityQuery(latitude, longitude) {
    try {
      const response = await api.get('/delivery-zone/check', {
        params: { latitude, longitude },
      });

      return response.data;
    } catch (error) {
      console.error('Serviceability check error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check service area');
    }
  }

  /**
   * Get delivery zone configuration (center, radius, etc.)
   */
  async getZoneConfig() {
    try {
      const response = await api.get('/delivery-zone');
      this.zoneConfig = response.data;
      return response.data;
    } catch (error) {
      console.error('Zone config fetch error:', error);
      throw new Error('Failed to fetch delivery zone configuration');
    }
  }

  /**
   * Check if current location is serviceable
   */
  async isCurrentLocationServiceable() {
    if (!this.currentLocation) {
      throw new Error('Current location not available');
    }

    return this.checkServiceability(this.currentLocation.latitude, this.currentLocation.longitude);
  }

  /**
   * Get serviceable shops for current location
   * businessType: 'grocery' | 'restaurant' | null
   */
  async getServiceableShops(businessType = null, page = 1, pageSize = 10) {
    try {
      if (!this.currentLocation) {
        throw new Error('Current location not available');
      }

      const params = {
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude,
        page,
        page_size: pageSize,
      };

      if (businessType) {
        params.business_type = businessType;
      }

      const response = await api.get('/shops/serviceable', { params });
      return response.data;
    } catch (error) {
      console.error('Get serviceable shops error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch serviceable shops');
    }
  }

  /**
   * Clear cached location
   */
  clearLocation() {
    this.currentLocation = null;
  }

  /**
   * Get cached location
   */
  getLocation() {
    return this.currentLocation;
  }

  /**
   * Set location manually (for address picker)
   */
  setLocation(latitude, longitude) {
    this.currentLocation = {
      latitude,
      longitude,
      accuracy: null,
      timestamp: Date.now(),
      manual: true,
    };
    return this.currentLocation;
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Also export class for testing
export default LocationService;
