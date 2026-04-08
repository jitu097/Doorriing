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
}

export default new PlatformController();
