const express = require('express');

const protect = require('../middlewares/auth.middleware');

const {
  getReactions,
  setReaction,
  removeReaction,
} = require('../controllers/reaction.controller');

const router = express.Router();

router.use(protect);

router.get('/media/:mediaId/reactions', getReactions);

router.put('/media/:mediaId/reactions', setReaction);

router.delete('/media/:mediaId/reactions', removeReaction);

module.exports = router;