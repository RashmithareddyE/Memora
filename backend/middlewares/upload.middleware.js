const multer = require('multer');

// Maps accepted MIME types to our internal mediaType classification.
// Anything not in this map is rejected by fileFilter below.
const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
};

// Configurable via env so the limit can be tuned per-deployment without a
// code change. Defaults to 50MB: generous enough for phone photos and
// short video clips, small enough to avoid a single request tying up
// memory for too long (memory storage holds the whole file in RAM).
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    const error = new Error('Unsupported file type. Allowed types: JPEG, PNG, WEBP, MP4, WEBM');
    return cb(error);
  }
  return cb(null, true);
};

// Memory storage: the file buffer lives only in RAM for the duration of
// the request, then gets streamed straight to R2. It is never written to
// the local disk, so there's nothing left behind to clean up.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

// Wraps multer's single-file upload so file-type and file-size errors come
// back as clean JSON, instead of falling through to Express's default
// HTML error page (which is what happens if multer's own error is left
// to propagate unhandled).
const uploadSingleMedia = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB` });
    }

    return res.status(400).json({ message: err.message || 'File upload failed' });
  });
};

module.exports = { uploadSingleMedia, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB };