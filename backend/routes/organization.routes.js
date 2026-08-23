const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { getEvents, getTimeline, getDuplicates } = require('../controllers/organization.controller');

const router = express.Router();

router.use(protect);
router.get('/organization/events', getEvents);
router.get('/organization/timeline', getTimeline);
router.get('/organization/duplicates', getDuplicates);

module.exports = router;