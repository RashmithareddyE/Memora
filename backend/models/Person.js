const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },

    embedding: {
      type: [Number],
      required: true,
      select: false,
    },

    memoryCount: {
      type: Number,
      default: 0,
    },

    representativeMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

personSchema.index({ room: 1, name: 1 });

module.exports = mongoose.model('Person', personSchema);