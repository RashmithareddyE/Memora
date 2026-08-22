const express = require('express');

const protect = require('../middlewares/auth.middleware');
const { uploadSingleMedia } = require('../middlewares/upload.middleware');
const {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
  analyzeMediaController,
} = require('../controllers/media.controller');

const router = express.Router();

// Every media route requires a valid, authenticated user.
// Room-membership checks happen inside the controllers, since they need
// to know *which* room before deciding whether req.userId belongs to it.
router.use(protect);

// Nested under rooms, mirroring how a room "owns" its media.
router.post('/rooms/:roomId/media', uploadSingleMedia, uploadMedia);
router.get('/rooms/:roomId/media', getRoomMedia);

// Flat, since a single media item is addressed by its own ID regardless
// of which room it belongs to.
router.get('/media/:id', getMediaById);
router.delete('/media/:id', deleteMedia);
router.post('/media/:id/analyze', analyzeMediaController);

module.exports = router;