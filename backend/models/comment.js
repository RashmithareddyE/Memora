const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
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

    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ media: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);