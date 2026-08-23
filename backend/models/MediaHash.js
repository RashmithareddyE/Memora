const mongoose = require('mongoose');

// Kept as its own collection (rather than a field on Media) so duplicate
// detection can be added without touching the existing Media model or
// media.controller.js upload flow at all.
const mediaHashSchema = new mongoose.Schema({
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
    unique: true,
  },
  // 64-character binary string produced by imageHash.service.js (dHash).
  hash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MediaHash', mediaHashSchema);