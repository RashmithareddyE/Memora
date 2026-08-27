const express = require('express');

const protect = require('../middlewares/auth.middleware');

const {
  getComments,
  createComment,
  deleteComment,
} = require('../controllers/comment.controller');

const router = express.Router();

router.use(protect);

router.get('/media/:mediaId/comments', getComments);

router.post('/media/:mediaId/comments', createComment);

router.delete('/comments/:id', deleteComment);

module.exports = router;