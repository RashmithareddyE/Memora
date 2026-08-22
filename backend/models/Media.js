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
  // --- AI analysis (Phase 9) ---
  // 'not_analyzed': never attempted, or not eligible (e.g. videos for now).
  // 'pending': a request to the AI provider is in flight.
  // 'completed': aiAnalysis below is populated and current.
  // 'failed': the last attempt errored; see aiError. Safe to retry.
  aiStatus: {
    type: String,
    enum: ['not_analyzed', 'pending', 'completed', 'failed'],
    default: 'not_analyzed',
  },
  // Human-readable reason for the last failure (e.g. "AI provider not
  // configured"), so the UI can explain what happened without guessing.
  aiError: {
    type: String,
    default: null,
  },
  aiAnalysis: {
    description: { type: String, default: null },
    people: { type: [String], default: [] },
    places: { type: [String], default: [] },
    objects: { type: [String], default: [] },
    events: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    analyzedAt: { type: Date, default: null },
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