const mongoose = require('mongoose');
const { groupByEvent, getTimeline, findDuplicates } = require('../services/mediaOrganization.service');

const validRoomId = (roomId) => roomId === undefined || mongoose.Types.ObjectId.isValid(roomId);

// GET /api/organization/events?roomId=
const getEvents = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!validRoomId(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const events = await groupByEvent(req.userId, roomId);
    return res.status(200).json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ message: 'Something went wrong while grouping events' });
  }
};

// GET /api/organization/timeline?roomId=
const getTimelineHandler = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!validRoomId(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const timeline = await getTimeline(req.userId, roomId);
    return res.status(200).json({ timeline });
  } catch (error) {
    console.error('Get timeline error:', error);
    return res.status(500).json({ message: 'Something went wrong while building the timeline' });
  }
};

// GET /api/organization/duplicates?roomId=
const getDuplicates = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!validRoomId(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const duplicates = await findDuplicates(req.userId, roomId);
    return res.status(200).json({ duplicates });
  } catch (error) {
    console.error('Get duplicates error:', error);
    return res.status(500).json({ message: 'Something went wrong while checking for duplicates' });
  }
};

module.exports = {
  getEvents,
  getTimeline: getTimelineHandler,
  getDuplicates,
};