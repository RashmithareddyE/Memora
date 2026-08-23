const mongoose = require('mongoose');
const { getHighlights, getRecommendations } = require('../services/highlights.service');

const validRoomId = (roomId) => roomId === undefined || mongoose.Types.ObjectId.isValid(roomId);

// GET /api/highlights?roomId=
const getHighlightsHandler = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!validRoomId(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const highlights = await getHighlights(req.userId, roomId);
    return res.status(200).json({ highlights });
  } catch (error) {
    console.error('Get highlights error:', error);
    return res.status(500).json({ message: 'Something went wrong while building highlights' });
  }
};

// GET /api/recommendations?roomId=
const getRecommendationsHandler = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!validRoomId(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const recommendations = await getRecommendations(req.userId, roomId);
    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return res.status(500).json({ message: 'Something went wrong while building recommendations' });
  }
};

module.exports = {
  getHighlights: getHighlightsHandler,
  getRecommendations: getRecommendationsHandler,
};