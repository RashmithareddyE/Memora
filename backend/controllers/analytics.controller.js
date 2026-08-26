const mongoose = require('mongoose');
const { buildOverview, buildRoomAnalytics } = require('../services/analytics.service');

// GET /api/analytics/overview
const getOverview = async (req, res) => {
  try {
    const overview = await buildOverview(req.userId);
    return res.status(200).json({ overview });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    return res.status(500).json({ message: 'Something went wrong while building analytics' });
  }
};

// GET /api/analytics/room/:roomId
const getRoomAnalytics = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const analytics = await buildRoomAnalytics(req.userId, roomId);

    if (!analytics) {
      return res.status(403).json({ message: 'You are not authorized to view analytics for this room' });
    }

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('Get room analytics error:', error);
    return res.status(500).json({ message: 'Something went wrong while building room analytics' });
  }
};

module.exports = { getOverview, getRoomAnalytics };