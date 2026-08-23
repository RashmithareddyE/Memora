const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { getHighlights, getRecommendations } = require('../controllers/highlights.controller');

const router = express.Router();

router.use(protect);
router.get('/highlights', getHighlights);
router.get('/recommendations', getRecommendations);

module.exports = router;