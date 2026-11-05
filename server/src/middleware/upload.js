const path = require('path');
const multer = require('multer');

const { httpError } = require('../config/httpError');

const maxMb = Number(process.env.MAX_UPLOAD_MB || 4);

// SVG is left out on purpose: it can carry scripts and is served from a public URL.
const IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/avif': ['.avif']
};
const DOCUMENT_TYPES = { 'application/pdf': ['.pdf'] };

function createFileFilter(allowedTypes, message) {
  return (req, file, cb) => {
    const extensions = allowedTypes[file.mimetype];
    if (!extensions || !extensions.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(Object.assign(new Error(message), { status: 400 }));
    }
    return cb(null, true);
  };
}

function createUploadMiddleware(allowedTypes, message) {
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: createFileFilter(allowedTypes, message),
    // Browsers send file names as UTF-8, which matters for Armenian and Russian names.
    defParamCharset: 'utf8',
    // Every upload form sends one file and nothing else, so anything more is refused early.
    limits: { fileSize: maxMb * 1024 * 1024, files: 1, fields: 0, parts: 1, headerPairs: 20 }
  });

  return (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        err.status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return next(err);
      }
      // Files stay in memory, so any other error without a status is the parser refusing a broken form.
      if (err && !err.status) return next(httpError(400, 'The upload could not be read.'));
      return next(err);
    });
  };
}

const acceptImage = createUploadMiddleware(IMAGE_TYPES, 'Only image uploads are allowed');
const acceptMediaFile = createUploadMiddleware({ ...IMAGE_TYPES, ...DOCUMENT_TYPES }, 'This file type is not supported.');

module.exports = { acceptImage, acceptMediaFile };
