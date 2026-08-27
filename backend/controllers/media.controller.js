const crypto = require('crypto');
const mongoose = require('mongoose');

const cloudinary = require('../config/r2');
const Media = require('../models/Media');
const Room = require('../models/Room');
const Person = require('../models/Person');

const { ALLOWED_MIME_TYPES } = require('../middlewares/upload.middleware');
const { analyzeMedia } = require('../services/aiMedia.service');
const { matchFacesForPhoto } = require('../services/person.service');
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

    // Fire-and-forget AI analysis.
    analyzeMedia(media._id).catch((error) => {
      console.error('AI analysis trigger error:', error);
    });

    // Notify room members in real time.
    emitMediaCreated(responseMedia);

    return res.status(201).json({
      media: responseMedia,
    });
  } catch (error) {
    console.error('Upload media error:', error);

    if (error.name === 'ValidationError') {
      const firstMessage = Object.values(error.errors)[0].message;

      return res.status(400).json({
        message: firstMessage,
      });
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
        message: 'You must be a member of this room to view its media',
      });
    }

    const media = await Media.find({ room: roomId })
      .sort({ createdAt: -1 })
      .select('-storageKey')
      .populate('uploader', 'name email');

    return res.status(200).json({
      media,
    });
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
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    const media = await Media.findById(id)
      .select('-storageKey')
      .populate('uploader', 'name email');

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to view this media',
      });
    }

    return res.status(200).json({
      media,
    });
  } catch (error) {
    console.error('Get media by id error:', error);

    return res.status(500).json({
      message: 'Something went wrong while fetching the media',
    });
  }
};

// DELETE /api/media/:id
const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    const room = await Room.findById(media.room);

    if (!room) {
      return res.status(404).json({
        message: 'Room not found',
      });
    }

    const userId = String(req.userId);

    const isMember = room.members.some(
      (memberId) => String(memberId) === userId
    );

    if (!isMember) {
      return res.status(403).json({
        message: 'You must be a member of this room to delete this media',
      });
    }

    const isUploader =
      media.uploader.toString() === String(req.userId);

    const isRoomOwner =
      room.owner.toString() === String(req.userId);

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
const analyzeMediaController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
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

// A normalized (0-1) bounding box, as produced by the frontend from the
// face-api detection box divided by the image's natural dimensions.
const isValidBox = (box) =>
  box === null ||
  box === undefined ||
  (typeof box === 'object' &&
    ['x', 'y', 'width', 'height'].every(
      (key) =>
        typeof box[key] === 'number' &&
        Number.isFinite(box[key]) &&
        box[key] >= -0.01 &&
        box[key] <= 1.5
    ));

const isValidDescriptor = (descriptor) =>
  Array.isArray(descriptor) &&
  descriptor.length === 128 &&
  descriptor.every(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );

// POST /api/media/:id/faces
//
// Body: { faces: [{ descriptor: number[128], box?: {x,y,width,height} }] }
//
// Replaces the full face list for this photo, so calling this endpoint
// again for the same photo (rescanning) is idempotent: the previous
// associations for this specific media are dropped and rebuilt from the
// freshly-detected faces, rather than appended to.
const saveMediaFaces = async (req, res) => {
  try {
    const { id } = req.params;

    // Accept either the current `faces: [{descriptor, box}]` shape or the
    // legacy `descriptors: number[][]` shape (no box data) for backwards
    // compatibility with any in-flight clients.
    const rawFaces = Array.isArray(req.body.faces)
      ? req.body.faces
      : Array.isArray(req.body.descriptors)
        ? req.body.descriptors.map((descriptor) => ({ descriptor, box: null }))
        : null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid media ID',
      });
    }

    if (!rawFaces) {
      return res.status(400).json({
        message: 'Face data must be an array',
      });
    }

    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({
        message: 'Media not found',
      });
    }

    if (media.mediaType !== 'image') {
      return res.status(400).json({
        message: 'Face detection is only supported for images',
      });
    }

    const room = await Room.findById(media.room);

    if (!room || !isRoomMember(room, req.userId)) {
      return res.status(403).json({
        message: 'You are not authorized to update this media',
      });
    }

    const faceInputs = rawFaces
      .filter(
        (face) =>
          face &&
          isValidDescriptor(face.descriptor) &&
          isValidBox(face.box)
      )
      .map((face) => ({
        descriptor: face.descriptor,
        box: face.box || null,
      }));

    // Track who this photo was previously linked to, so we can correct
    // their memoryCount too if this rescan changes the result (e.g. a
    // face that no longer detects, or now resolves to someone else).
    const previousPersonIds = (media.faces || []).map((face) =>
      face.person.toString()
    );

    let detectedFaces = [];

    if (faceInputs.length > 0) {
      const results = await matchFacesForPhoto(
        media.room,
        faceInputs,
        media._id
      );

      detectedFaces = results.map((result) => ({
        person: result.person._id,
        confidence:
          result.distance === 0
            ? 1
            : Math.max(0, 1 - result.distance),
        box: result.box || undefined,
      }));
    }

    // Replace the face list for this photo. Combined with the matching
    // service's idempotent embedding handling, this makes rescanning the
    // same photo safe to repeat any number of times.
    media.faces = detectedFaces;

    await media.save();

    // Recalculate memoryCount only for people actually touched by this
    // photo (before and/or after), rather than every person in the room,
    // since counts elsewhere in the room are unaffected by this save.
    const touchedPersonIds = new Set([
      ...previousPersonIds,
      ...detectedFaces.map((face) => face.person.toString()),
    ]);

    for (const personId of touchedPersonIds) {
      const count = await Media.countDocuments({
        room: media.room,
        'faces.person': personId,
      });

      await Person.updateOne(
        { _id: personId },
        { $set: { memoryCount: count } }
      );
    }

    const responseMedia = await Media.findById(media._id)
      .select('-storageKey')
      .populate('uploader', 'name email')
      .populate(
        'faces.person',
        'name memoryCount representativeMedia'
      );

    return res.status(200).json({
      media: responseMedia,
    });
  } catch (error) {
    console.error('Save media faces error:', error);

    return res.status(500).json({
      message:
        'Something went wrong while saving detected faces',
    });
  }
};

module.exports = {
  uploadMedia,
  getRoomMedia,
  getMediaById,
  deleteMedia,
  analyzeMediaController,
  saveMediaFaces,
};