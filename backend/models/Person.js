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

    // Multiple reference embeddings per person (instead of a single
    // "locked" embedding). A face is matched against the BEST distance
    // across all of a person's reference embeddings, which lets the same
    // real person be recognized across different poses/lighting/angles
    // without needing a single embedding to represent every variation.
    // Never exposed to the frontend (select: false + always excluded in
    // controller projections).
    embeddings: {
      type: [[Number]],
      required: true,
      select: false,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'A person must have at least one reference embedding',
      },
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

    // Normalized (0-1) bounding box of this person's face within
    // representativeMedia, so the frontend can render a face crop instead
    // of the entire (possibly multi-person) photo.
    representativeFaceBox: {
      x: { type: Number, default: null },
      y: { type: Number, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  }
);

personSchema.index({ room: 1, name: 1 });

module.exports = mongoose.model('Person', personSchema);