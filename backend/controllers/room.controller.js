const crypto = require('crypto');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');
const { emitMemberJoined, emitMemberLeft } = require('../socket');

const ROOM_CODE_LENGTH = 6;
// Excludes visually ambiguous characters: 0/O, 1/I/L
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 5;

const generateRoomCode = () => {
  let code = '';

  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_CHARS.charAt(
      crypto.randomInt(0, ROOM_CODE_CHARS.length)
    );
  }

  return code;
};

// Populates owner/members with just name + email
// (password is excluded from User queries).
const populateRoom = (query) =>
  query
    .populate('owner', 'name email')
    .populate('members', 'name email');

// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    let room = null;

    // Generate a random room code.
    // If a very rare unique-index collision occurs,
    // generate another code and retry.
    for (
      let attempt = 0;
      attempt < MAX_CODE_ATTEMPTS && !room;
      attempt += 1
    ) {
      const code = generateRoomCode();

      try {
        room = await Room.create({
          name: name.trim(),
          code,
          owner: req.userId,
          members: [req.userId],
        });
      } catch (error) {
        if (error.code === 11000) {
          continue;
        }

        throw error;
      }
    }

    if (!room) {
      return res.status(409).json({
        message:
          'Could not generate a unique room code, please try again',
      });
    }

    const populatedRoom = await populateRoom(
      Room.findById(room._id)
    );

    return res.status(201).json({ room: populatedRoom });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const firstMessage = Object.values(error.errors)[0].message;

      return res.status(400).json({
        message: firstMessage,
      });
    }

    console.error('Create room error:', error);

    return res.status(500).json({
      message: 'Something went wrong while creating the room',
    });
  }
};

// @route   POST /api/rooms/join
// @access  Private
const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        message: 'Room code is required',
      });
    }

    const room = await Room.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!room) {
      return res.status(404).json({
        message: 'No room found with this code',
      });
    }

    const isAlreadyMember = room.members.some(
      (memberId) => memberId.toString() === req.userId
    );

    if (isAlreadyMember) {
      const populatedRoom = await populateRoom(
        Room.findById(room._id)
      );

      return res.status(200).json({
        message: 'You are already a member of this room',
        room: populatedRoom,
      });
    }

    room.members.push(req.userId);
    await room.save();

    const populatedRoom = await populateRoom(
      Room.findById(room._id)
    );

    // Phase 14:
    // Notify existing members that someone joined the room.
    const joinedMember = populatedRoom.members.find(
      (member) => member._id.toString() === req.userId
    );

    if (joinedMember) {
      emitMemberJoined(room._id, joinedMember);
    }

    return res.status(200).json({
      room: populatedRoom,
    });
  } catch (error) {
    console.error('Join room error:', error);

    return res.status(500).json({
      message: 'Something went wrong while joining the room',
    });
  }
};

// @route   GET /api/rooms
// @access  Private
const getMyRooms = async (req, res) => {
  try {
    const rooms = await populateRoom(
      Room.find({ members: req.userId }).sort({
        createdAt: -1,
      })
    );

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Get my rooms error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching your rooms',
    });
  }
};

// @route   GET /api/rooms/:id
// @access  Private (members only)
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room ID',
      });
    }

    const room = await populateRoom(
      Room.findById(id)
    );

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    const isMember = room.members.some(
      (member) => member._id.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error('Get room by id error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching the room',
    });
  }
};

// @route   POST /api/rooms/:id/leave
// @access  Private (members only, owner blocked)
const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room ID',
      });
    }

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    if (room.owner.toString() === req.userId) {
      return res.status(400).json({
        message:
          'The room owner cannot leave. Transfer ownership or delete the room instead.',
      });
    }

    // Get safe user information before removing the user.
    // This is only used for the real-time notification.
    const leavingUser = await User.findById(req.userId).select(
      'name email'
    );

    room.members = room.members.filter(
      (memberId) => memberId.toString() !== req.userId
    );

    await room.save();

    // Phase 14:
    // Notify remaining room members that this user left.
    if (leavingUser) {
      emitMemberLeft(room._id, {
        _id: leavingUser._id,
        name: leavingUser.name,
        email: leavingUser.email,
      });
    }

    return res.status(200).json({
      message: 'You have left the room',
    });
  } catch (error) {
    console.error('Leave room error:', error);

    return res.status(500).json({
      message: 'Something went wrong while leaving the room',
    });
  }
};

// @route   DELETE /api/rooms/:id
// @access  Private (owner only)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid room ID',
      });
    }

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    if (room.owner.toString() !== req.userId) {
      return res.status(403).json({
        message: 'Only the room owner can delete this room',
      });
    }

    await room.deleteOne();

    return res.status(200).json({
      message: 'Room deleted successfully',
    });
  } catch (error) {
    console.error('Delete room error:', error);

    return res.status(500).json({
      message: 'Something went wrong while deleting the room',
    });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomById,
  leaveRoom,
  deleteRoom,
};