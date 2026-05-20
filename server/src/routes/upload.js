const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { put } = require('@vercel/blob');

const { verifyToken, requireAnyRole } = require('../middleware/auth');

const uploadRouter = express.Router();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const absoluteUploadDir = path.join(__dirname, '..', '..', uploadDir);

const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);

function buildSafeFilename(originalname) {
  const safeBase = path
    .basename(originalname)
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
  const ext = path.extname(safeBase).toLowerCase();
  const name = safeBase.replace(ext, '');
  return `${Date.now()}_${name}${ext}`;
}

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  return cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024 }
});

uploadRouter.post('/', verifyToken, requireAnyRole(['admin', 'editor']), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: { message: 'Missing file' } });
    const filename = buildSafeFilename(req.file.originalname);

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${filename}`, req.file.buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: req.file.mimetype || undefined
      });
      return res.status(201).json({ ok: true, url: blob.url });
    }

    if (process.env.VERCEL) {
      return res.status(503).json({
        ok: false,
        error: { message: 'File uploads require Vercel Blob (set BLOB_READ_WRITE_TOKEN on the project).' }
      });
    }

    ensureDir(absoluteUploadDir);
    fs.writeFileSync(path.join(absoluteUploadDir, filename), req.file.buffer);
    return res.status(201).json({ ok: true, url: `/uploads/${filename}` });
  } catch (err) {
    return next(err);
  }
});

module.exports = { uploadRouter };
