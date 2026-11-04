const express = require('express');

const { verifyToken, requireAnyRole } = require('../middleware/auth');
const { acceptImage } = require('../middleware/upload');
const { storeFile } = require('../services/fileStorage');

const uploadRouter = express.Router();

uploadRouter.post('/', verifyToken, requireAnyRole(['admin', 'editor']), acceptImage, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: { message: 'Missing file' } });
    const url = await storeFile(req.file);
    return res.status(201).json({ ok: true, url });
  } catch (err) {
    return next(err);
  }
});

module.exports = { uploadRouter };
