const mongoose = require('mongoose');

const Reaction = require('../models/reaction');
const Media = require('../models/Media');
const Room = require('../models/Room');

const REACTION_TYPES = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const isRoomMember = (room, userId) =>
  room.members.some(
    (memberId) => memberId.toString() === String(userId)
  );

// GET /api/media/:mediaId/reactions
const getReactions = async (req, res) => {
  try {
    const { mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    const media = await Media.findById(mediaId);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    const reactions = await Reaction.find({
      media: mediaId,
      room: media.room,
    })
      .populate('user', 'name email')
      .lean();

    const counts = {};

    for (const type of REACTION_TYPES) {
      counts[type] = 0;
    }

    for (const reaction of reactions) {
      counts[reaction.type] =
        (counts[reaction.type] || 0) + 1;
    }

    const mine =
      reactions.find(
        (reaction) =>
          reaction.user?._id?.toString() === String(req.userId)
      )?.type || null;

    return res.status(200).json({
      counts,
      mine,
    });
  } catch (error) {
    console.error('Get reactions error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching reactions',
    });
  }
};

// PUT /api/media/:mediaId/reactions
const setReaction = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    if (!REACTION_TYPES.includes(type)) {
      return res.status(400).json({
        message: 'Invalid reaction type',
      });
    }

    const media = await Media.findById(mediaId);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    const reaction = await Reaction.findOneAndUpdate(
      {
        media: media._id,
        user: req.userId,
      },
      {
        room: media.room,
        media: media._id,
        user: req.userId,
        type,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    const reactions = await Reaction.find({
      media: media._id,
      room: media.room,
    })
      .populate('user', 'name email')
      .lean();

    const counts = {};

    for (const reactionType of REACTION_TYPES) {
      counts[reactionType] = 0;
    }

    for (const item of reactions) {
      counts[item.type] =
        (counts[item.type] || 0) + 1;
    }

    try {
      const { getIO } = require('../socket');
      const io = getIO();

      if (io) {
        const userName =
          reactions.find(
            (item) =>
              item.user?._id?.toString() === String(req.userId)
          )?.user?.name || 'Someone';

        io.to(media.room.toString()).emit(
          'room:reaction-updated',
          {
            mediaId: media._id.toString(),
            counts,
            mine: reaction.type,
            activity: `${userName} reacted ${reaction.type} to a memory.`,
          }
        );
      }
    } catch (socketError) {
      console.error('Reaction socket notification error:', socketError);
    }

    return res.status(200).json({
      counts,
      mine: reaction.type,
    });
  } catch (error) {
    console.error('Set reaction error:', error);

    return res.status(500).json({
      message: 'Something went wrong while saving the reaction',
    });
  }
};

// DELETE /api/media/:mediaId/reactions
const removeReaction = async (req, res) => {
  try {
    const { mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    const media = await Media.findById(mediaId);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    await Reaction.deleteOne({
      media: media._id,
      user: req.userId,
    });

    const reactions = await Reaction.find({
      media: media._id,
      room: media.room,
    }).lean();

    const counts = {};

    for (const type of REACTION_TYPES) {
      counts[type] = 0;
    }

    for (const reaction of reactions) {
      counts[reaction.type] =
        (counts[reaction.type] || 0) + 1;
    }

    try {
      const { getIO } = require('../socket');
      const io = getIO();

      if (io) {
        io.to(media.room.toString()).emit(
          'room:reaction-updated',
          {
            mediaId: media._id.toString(),
            counts,
            mine: null,
          }
        );
      }
    } catch (socketError) {
      console.error('Reaction removal socket error:', socketError);
    }

    return res.status(200).json({
      counts,
      mine: null,
    });
  } catch (error) {
    console.error('Remove reaction error:', error);

    return res.status(500).json({
      message: 'Something went wrong while removing the reaction',
    });
  }
};

module.exports = {
  getReactions,
  setReaction,
  removeReaction,
};