const express = require('express');
const {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomById,
  leaveRoom,
  deleteRoom,
} = require('../controllers/room.controller');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();

// Every room route requires a valid, authenticated user
router.use(protect);

router.post('/', createRoom);
router.post('/join', joinRoom);
router.get('/', getMyRooms);
router.get('/:id', getRoomById);
router.post('/:id/leave', leaveRoom);
router.delete('/:id', deleteRoom);

module.exports = router;