const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { getOverview, getRoomAnalytics } = require('../controllers/analytics.controller');

const router = express.Router();

router.use(protect);
router.get('/analytics/overview', getOverview);
router.get('/analytics/room/:roomId', getRoomAnalytics);

module.exports = router;