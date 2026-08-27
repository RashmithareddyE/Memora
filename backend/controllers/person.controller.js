const mongoose = require('mongoose');
const Person = require('../models/Person');
const Media = require('../models/Media');
const Room = require('../models/Room');

const isRoomMember = (room, userId) =>
  room.members.some((memberId) => memberId.toString() === userId);

// GET /api/rooms/:roomId/people
const getRoomPeople = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You must be a member of this room',
      });
    }

    const people = await Person.find({ room: roomId })
      .select('-embeddings')
      .populate('representativeMedia', 'publicUrl originalName');

    return res.status(200).json({ people });
  } catch (error) {
    console.error('Get room people error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching people',
    });
  }
};

// PATCH /api/people/:id
const renamePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid person ID',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Person name is required',
      });
    }

    const person = await Person.findById(id);

    if (!person) {
      return res.status(404).json({
        message: 'Person not found',
      });
    }

    const room = await Room.findById(person.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to rename this person',
      });
    }

    person.name = name.trim();
    await person.save();

    const responsePerson = await Person.findById(person._id)
      .select('-embeddings')
      .populate('representativeMedia', 'publicUrl originalName');

    return res.status(200).json({
      person: responsePerson,
    });
  } catch (error) {
    console.error('Rename person error:', error);

    return res.status(500).json({
      message: 'Something went wrong while renaming the person',
    });
  }
};

// GET /api/people/:id/media
const getPersonMedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid person ID',
      });
    }

    const person = await Person.findById(id);

    if (!person) {
      return res.status(404).json({
        message: 'Person not found',
      });
    }

    const room = await Room.findById(person.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to view this person',
      });
    }

    const media = await Media.find({
      room: person.room,
      'faces.person': person._id,
    })
      .sort({ createdAt: -1 })
      .select('-storageKey')
      .populate('uploader', 'name email');

    return res.status(200).json({
      person: {
        _id: person._id,
        name: person.name,
        memoryCount: media.length,
        representativeMedia: person.representativeMedia,
        representativeFaceBox: person.representativeFaceBox,
      },
      media,
    });
  } catch (error) {
    console.error('Get person media error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching this person’s media',
    });
  }
};
// TEMPORARY: Reset face/person grouping for one room.
// This does NOT delete uploaded media files.
const resetRoomPeople = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        message: 'Invalid room ID',
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    if (!isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You must be a member of this room',
      });
    }

    // Find all Person records belonging to this room.
    const people = await Person.find({
      room: roomId,
    }).select('_id');

    const personIds = people.map((person) => person._id);

    // Remove the old person references from media.
    // The media itself is NOT deleted.
    if (personIds.length > 0) {
      await Media.updateMany(
        {
          room: roomId,
          'faces.person': { $in: personIds },
        },
        {
          $pull: {
            faces: {
              person: { $in: personIds },
            },
          },
        }
      );
    }

    // Delete only the Person records.
    await Person.deleteMany({
      room: roomId,
    });

    return res.status(200).json({
      message: 'Old people/face grouping reset successfully',
      removedPeople: personIds.length,
    });
  } catch (error) {
    console.error('Reset room people error:', error);

    return res.status(500).json({
      message: 'Something went wrong while resetting people',
    });
  }
};

module.exports = {
  getRoomPeople,
  renamePerson,
  getPersonMedia,
  resetRoomPeople,
};