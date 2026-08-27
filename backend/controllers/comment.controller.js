const mongoose = require('mongoose');

const Comment = require('../models/comment');
const Media = require('../models/Media');
const Room = require('../models/Room');

const isRoomMember = (room, userId) =>
  room.members.some(
    (memberId) => memberId.toString() === String(userId)
  );

// GET /api/media/:mediaId/comments
const getComments = async (req, res) => {
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

    const comments = await Comment.find({
      media: mediaId,
      room: media.room,
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name email')
      .lean();

    return res.status(200).json({
      comments,
    });
  } catch (error) {
    console.error('Get comments error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching comments',
    });
  }
};

// POST /api/media/:mediaId/comments
const createComment = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const text = typeof req.body.text === 'string'
      ? req.body.text.trim()
      : '';

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    if (!text) {
      return res.status(400).json({
        message: 'Comment cannot be empty',
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        message: 'Comment must be 1000 characters or less',
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

    const comment = await Comment.create({
      room: media.room,
      media: media._id,
      user: req.userId,
      text,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name email')
      .lean();

    // Notify everyone currently viewing this room.
    try {
      const { getIO } = require('../socket');
      const io = getIO();

      if (io) {
        io.to(media.room.toString()).emit('room:comment-created', {
          comment: populatedComment,
          activity: `${populatedComment.user?.name || 'Someone'} commented on a memory.`,
        });
      }
    } catch (socketError) {
      console.error('Comment socket notification error:', socketError);
    }

    return res.status(201).json({
      comment: populatedComment,
    });
  } catch (error) {
    console.error('Create comment error:', error);

    return res.status(500).json({
      message: 'Something went wrong while creating the comment',
    });
  }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid comment ID',
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        message: 'Comment not found',
      });
    }

    const room = await Room.findById(comment.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not a member of this room',
      });
    }

    const isOwner =
      comment.user.toString() === String(req.userId);

    const isRoomOwner =
      room.owner.toString() === String(req.userId);

    if (!isOwner && !isRoomOwner) {
      return res.status(403).json({
        message: 'You cannot delete this comment',
      });
    }

    await comment.deleteOne();

    try {
      const { getIO } = require('../socket');
      const io = getIO();

      if (io) {
        io.to(comment.room.toString()).emit(
          'room:comment-deleted',
          {
            commentId: comment._id.toString(),
            mediaId: comment.media.toString(),
          }
        );
      }
    } catch (socketError) {
      console.error('Comment delete socket error:', socketError);
    }

    return res.status(200).json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);

    return res.status(500).json({
      message: 'Something went wrong while deleting the comment',
    });
  }
};

module.exports = {
  getComments,
  createComment,
  deleteComment,
};