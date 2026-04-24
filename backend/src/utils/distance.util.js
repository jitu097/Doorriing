import { logger } from './logger.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Check if user location is inside delivery zone
 * Returns object { isServiceable: boolean, distance: number, message: string }
 */
export const checkServiceability = (userLat, userLon, zoneConfig) => {
  try {
    if (!zoneConfig || !zoneConfig.centerLat || !zoneConfig.centerLon || !zoneConfig.radiusKm) {
      logger.warn('Invalid zone config', { zoneConfig });
      return {
        isServiceable: false,
        distance: null,
        message: 'Service area not configured',
      };
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      zoneConfig.centerLat,
      zoneConfig.centerLon
    );

    const isServiceable = distance <= zoneConfig.radiusKm;

    return {
      isServiceable,
      distance: parseFloat(distance.toFixed(2)),
      radiusKm: zoneConfig.radiusKm,
      message: isServiceable
        ? `You are within our delivery zone (${distance.toFixed(1)} km away)`
        : `Sorry, we don't deliver to your area. You are ${distance.toFixed(1)} km away. We deliver within ${zoneConfig.radiusKm} km radius.`,
    };
  } catch (error) {
    logger.error('Error checking serviceability', { error: error.message });
    return {
      isServiceable: false,
      distance: null,
      message: 'Unable to check service area',
    };
  }
};

/**
 * Validate coordinates format
 */
export const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Invalid latitude or longitude format' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true, latitude: lat, longitude: lon };
};
