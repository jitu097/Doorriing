import platformService from './platform.service.js';

class PlatformController {
  async getSettings(req, res) {
    try {
      const settings = await platformService.getPlatformSettings();
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load platform settings',
      });
    }
  }

  async getAvailability(req, res) {
    try {
      const data = await platformService.getAvailability();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check platform availability',
      });
    }
  }
}

export default new PlatformController();
