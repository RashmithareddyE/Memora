const crypto = require('crypto');
const mongoose = require('mongoose');

const cloudinary = require('../config/r2');
const Media = require('../models/Media');
const Room = require('../models/Room');
const { ALLOWED_MIME_TYPES } = require('../middlewares/upload.middleware');
const { analyzeMedia } = require('../services/aiMedia.service');
const { emitMediaCreated, emitMediaDeleted } = require('../socket');

const sanitizeFilename = (filename) =>
  filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');

const isRoomMember = (room, userId) =>
  room.members.some((memberId) => memberId.toString() === userId);

// Upload a buffer to Cloudinary
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });

// POST /api/rooms/:roomId/media
const uploadMedia = async (req, res) => {
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
        message: 'You must be a member of this room to upload media',
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A file is required' });
    }

    const mediaType = ALLOWED_MIME_TYPES[req.file.mimetype];

    const sanitizedName = sanitizeFilename(req.file.originalname);

    const publicId = `memora/rooms/${roomId}/${crypto.randomUUID()}-${sanitizedName}`;

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      public_id: publicId,
      resource_type: mediaType === 'video' ? 'video' : 'image',
      folder: undefined,
    });

    const media = await Media.create({
      room: roomId,
      uploader: req.userId,
      originalName: req.file.originalname,
      storageKey: uploadResult.public_id,
      publicUrl: uploadResult.secure_url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      mediaType,
    });

    const responseMedia = await Media.findById(media._id)
      .select('-storageKey')
      .populate('uploader', 'name email');

    // Fire-and-forget: analyzeMedia() handles and records its own failures
    // (not configured, provider error, etc.), so this is only a safety net
    // for something unexpected. The upload response is never delayed by it.
    analyzeMedia(media._id).catch((error) => {
      console.error('AI analysis trigger error:', error);
    });

    // Real-time: notify anyone currently viewing this room. The uploader's
    // own client will see this event too, but the frontend deduplicates by
    // media _id, so they never see a duplicate from their own HTTP response.
    emitMediaCreated(responseMedia);

    return res.status(201).json({
      media: responseMedia,
    });
  } catch (error) {
    console.error('Upload media error:', error);

    if (error.name === 'ValidationError') {
      const firstMessage = Object.values(error.errors)[0].message;
      return res.status(400).json({ message: firstMessage });
    }

    return res.status(500).json({
      message: 'Something went wrong while uploading the file',
    });
  }
};

// GET /api/rooms/:roomId/media
const getRoomMedia = async (req, res) => {
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
        message: 'You must be a member of this room to view its media',
      });
    }

    const media = await Media.find({ room: roomId })
      .sort({ createdAt: -1 })
      .select('-storageKey')
      .populate('uploader', 'name email');

    return res.status(200).json({ media });
  } catch (error) {
    console.error('Get room media error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching room media',
    });
  }
};

// GET /api/media/:id
const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid media ID' });
    }

    const media = await Media.findById(id)
      .select('-storageKey')
      .populate('uploader', 'name email');

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to view this media',
      });
    }

    return res.status(200).json({ media });
  } catch (error) {
    console.error('Get media by id error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching the media',
    });
  }
};

// DELETE /api/media/:id
// DELETE /api/media/:id
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid media ID' });
    }

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    const room = await Room.findById(media.room);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const userId = String(req.userId);
    const ownerId = String(room.owner);
    const uploaderId = String(media.uploader);

    const isRoomMember = room.members.some(
      (memberId) => String(memberId) === userId
    );

    if (!isRoomMember) {
      return res.status(403).json({
        message: 'You must be a member of this room to delete this media',
      });
    }

    const isUploader = media.uploader.toString() === String(req.userId);
    const isRoomOwner = room.owner.toString() === String(req.userId);

  console.log('DELETE DEBUG:', {
   mediaUploader: media.uploader.toString(),
   roomOwner: room.owner.toString(),
   currentUser: String(req.userId),
   isUploader,
   isRoomOwner,
   });

    if (!isUploader && !isRoomOwner) {
      return res.status(403).json({
        message: 'Only the uploader or the room owner can delete this media',
      });
    }

    const resourceType =
      media.mediaType === 'video' ? 'video' : 'image';

    try {
      await cloudinary.uploader.destroy(media.storageKey, {
        resource_type: resourceType,
        type: 'upload',
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);

      return res.status(502).json({
        message:
          'Could not delete the file from storage, please try again',
      });
    }

    await media.deleteOne();

  
    emitMediaDeleted(room._id, media._id);

    return res.status(200).json({
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Delete media error:', error);

    return res.status(500).json({
      message: 'Something went wrong while deleting the media',
    });
  }
};

// POST /api/media/:id/analyze
// Manually trigger (or retry) AI analysis for a single media item.
const analyzeMediaController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid media ID' });
    }

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to analyze this media',
      });
    }

    await analyzeMedia(media._id);

    const responseMedia = await Media.findById(id)
      .select('-storageKey')
      .populate('uploader', 'name email');

    return res.status(200).json({
      media: responseMedia,
    });
  } catch (error) {
    console.error('Analyze media error:', error);

    return res.status(500).json({
      message: 'Something went wrong while analyzing the media',
    });
  }
};

module.exports = {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
  analyzeMediaController,
};