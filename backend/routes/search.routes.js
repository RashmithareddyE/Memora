const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { searchMedia } = require('../controllers/search.controller');

const router = express.Router();

router.use(protect);
router.get('/memories/search', searchMedia);

module.exports = router;
