const express = require('express');
const { register, login, getCurrentUser } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);

module.exports = router;