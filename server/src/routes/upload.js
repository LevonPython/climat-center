const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { verifyToken, requireAnyRole } = require('../middleware/auth');

const uploadRouter = express.Router();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const absoluteUploadDir = path.join(__dirname, '..', '..', uploadDir);
ensureDir(absoluteUploadDir);

const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, absoluteUploadDir),
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 80);
    const ext = path.extname(safeBase).toLowerCase();
    const name = safeBase.replace(ext, '');
    cb(null, `${Date.now()}_${name}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024 }
});

uploadRouter.post('/', verifyToken, requireAnyRole(['admin', 'editor']), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: { message: 'Missing file' } });
  const url = `/uploads/${req.file.filename}`;
  return res.status(201).json({ ok: true, url });
});

module.exports = { uploadRouter };

