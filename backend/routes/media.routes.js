const express = require('express');

const protect = require('../middlewares/auth.middleware');
const { uploadSingleMedia } = require('../middlewares/upload.middleware');

const {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
  analyzeMediaController,
  saveMediaFaces,
} = require('../controllers/media.controller');

const router = express.Router();

// Every media route requires a valid, authenticated user.
router.use(protect);

// Room media
router.post(
  '/rooms/:roomId/media',
  uploadSingleMedia,
  uploadMedia
);

router.get(
  '/rooms/:roomId/media',
  getRoomMedia
);

// Individual media
router.get(
  '/media/:id',
  getMediaById
);

router.delete(
  '/media/:id',
  deleteMedia
);

router.post(
  '/media/:id/analyze',
  analyzeMediaController
);

// Face descriptors detected in the browser
router.post(
  '/media/:id/faces',
  saveMediaFaces
);

module.exports = router;