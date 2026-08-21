const mongoose = require('mongoose');

const MEDIA_TYPES = ['image', 'video'];

const mediaSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true,
  },
  // The object's key/path inside the R2 bucket. Internal — never returned
  // to the client (see controller: excluded from all API responses).
  storageKey: {
    type: String,
    required: true,
    unique: true,
  },
  // The URL the frontend actually uses to display/download the file.
  publicUrl: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
    min: [1, 'File size must be greater than 0'],
  },
  mediaType: {
    type: String,
    enum: {
      values: MEDIA_TYPES,
      message: '{VALUE} is not a supported media type',
    },
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Room media is almost always queried as "newest first for this room",
// so a compound index on exactly that access pattern keeps it fast.
mediaSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);