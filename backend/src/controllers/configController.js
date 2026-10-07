const SystemConfig = require('../models/SystemConfig');

const getIO = (req) => req.app.get('io');

// Get current system configuration
const getConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'main_config' });
    if (!config) {
      config = await SystemConfig.create({ key: 'main_config', isAllotmentOpen: false });
    }
    return res.status(200).json({
      success: true,
      config: {
        isAllotmentOpen: config.isAllotmentOpen,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching config' });
  }
};

// Toggle Room Allotment Open/Lock state (Warden Admin Only)
const toggleAllotment = async (req, res) => {
  try {
    const { isOpen } = req.body;
    let config = await SystemConfig.findOne({ key: 'main_config' });

    if (!config) {
      config = new SystemConfig({ key: 'main_config' });
    }

    config.isAllotmentOpen = typeof isOpen === 'boolean' ? isOpen : !config.isAllotmentOpen;
    config.updatedBy = req.user._id;
    await config.save();

    // Broadcast Socket.io event to all connected clients instantly
    const io = getIO(req);
    if (io) {
      io.emit('allotment_status_changed', {
        isAllotmentOpen: config.isAllotmentOpen,
        updatedBy: req.user.name,
        message: config.isAllotmentOpen
          ? '🔓 Room Allotment has been STARTED by the Hostel Warden! Booking is now LIVE.'
          : '🔒 Room Allotment has been LOCKED by the Hostel Warden.',
      });
    }

    return res.status(200).json({
      success: true,
      message: config.isAllotmentOpen
        ? 'Room Allotment started successfully! All students can now select rooms live.'
        : 'Room Allotment locked successfully.',
      config: {
        isAllotmentOpen: config.isAllotmentOpen,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('toggleAllotment error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling allotment state' });
  }
};

module.exports = {
  getConfig,
  toggleAllotment,
};
