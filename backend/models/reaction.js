const mongoose = require('mongoose');

const REACTION_TYPES = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const reactionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },

    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: REACTION_TYPES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One active reaction per user per memory.
// Clicking another reaction changes their reaction.
reactionSchema.index(
  { media: 1, user: 1 },
  { unique: true }
);

reactionSchema.index({ media: 1, type: 1 });

module.exports = mongoose.model('Reaction', reactionSchema);