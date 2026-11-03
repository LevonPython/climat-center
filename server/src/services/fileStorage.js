const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { put, del } = require('@vercel/blob');

const { httpError } = require('../config/httpError');

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const absoluteUploadDir = path.join(__dirname, '..', '..', uploadDir);

function buildSafeFilename(originalname) {
  const safeBase = path
    .basename(originalname)
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 80);
  const ext = path.extname(safeBase).toLowerCase();
  const name = safeBase.slice(0, safeBase.length - ext.length);
  return `${Date.now()}_${crypto.randomBytes(3).toString('hex')}_${name}${ext}`;
}

async function storeFile(file) {
  const filename = buildSafeFilename(file.originalname);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, file.buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.mimetype || undefined
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw httpError(503, 'File storage is not set up yet.');
  }

  fs.mkdirSync(absoluteUploadDir, { recursive: true });
  fs.writeFileSync(path.join(absoluteUploadDir, filename), file.buffer);
  return `/uploads/${filename}`;
}

async function deleteFile(url) {
  if (url.startsWith('/uploads/')) {
    fs.rmSync(path.join(absoluteUploadDir, path.basename(url)), { force: true });
    return;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url);
  }
}

module.exports = { deleteFile, storeFile };
