const mongoose = require('mongoose');
const { searchMemories } = require('../services/memorySearch.service');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;

// GET /api/memories/search?q=&roomId=&page=&limit=
const searchMedia = async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const { roomId } = req.query;

    if (roomId !== undefined && !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const parsedPage = parseInt(req.query.page, 10);
    const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;

    const { results, total } = await searchMemories({
      userId: req.userId,
      query,
      roomId,
      limit,
      page,
    });

    return res.status(200).json({
      results,
      total,
      page,
      limit,
      query: query.trim(),
    });
  } catch (error) {
    console.error('Search media error:', error);
    return res.status(500).json({
      message: 'Something went wrong while searching memories',
    });
  }
};

module.exports = { searchMedia };