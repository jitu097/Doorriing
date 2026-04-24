import { logger } from '../../utils/logger.js';

/**
 * Delivery Zone Configuration
 * This is currently a static config but can be extended to use a database table later
 */
class DeliveryZoneService {
  constructor() {
    // Default zone configuration for Latehar, Jharkhand
    // Can be updated via API or database later
    this.zoneConfig = {
      id: 'latehar-zone',
      name: 'Latehar',
      centerLat: 24.2669, // Latehar center coordinates
      centerLon: 84.3566,
      radiusKm: 8.5, // 8.5 km delivery radius
      isActive: true,
      city: 'Latehar',
      state: 'Jharkhand',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get current delivery zone configuration
   */
  getZoneConfig() {
    return this.zoneConfig;
  }

  /**
   * Update zone configuration (can be used for admin settings)
   */
  updateZoneConfig(newConfig) {
    try {
      if (!newConfig.centerLat || !newConfig.centerLon || !newConfig.radiusKm) {
        throw new Error('Invalid config: centerLat, centerLon, and radiusKm are required');
      }

      this.zoneConfig = {
        ...this.zoneConfig,
        ...newConfig,
        updatedAt: new Date(),
      };

      logger.info('Zone config updated', { zoneConfig: this.zoneConfig });
      return this.zoneConfig;
    } catch (error) {
      logger.error('Error updating zone config', { error: error.message });
      throw error;
    }
  }

  /**
   * Get zone details as API response
   */
  getZoneDetails() {
    return {
      success: true,
      data: {
        id: this.zoneConfig.id,
        name: this.zoneConfig.name,
        center: {
          latitude: this.zoneConfig.centerLat,
          longitude: this.zoneConfig.centerLon,
        },
        radiusKm: this.zoneConfig.radiusKm,
        city: this.zoneConfig.city,
        state: this.zoneConfig.state,
      },
    };
  }
}

// Export singleton instance
export const deliveryZoneService = new DeliveryZoneService();
