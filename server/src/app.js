const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const { authRouter } = require('./routes/auth');
const { servicesRouter } = require('./routes/services');
const { bookingsRouter } = require('./routes/bookings');
const { contentRouter } = require('./routes/content');
const { uploadRouter } = require('./routes/upload');
const { quizSubmissionsRouter } = require('./routes/quizSubmissions');

function createApp() {
  const app = express();

  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) || [];
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'production' ? corsOrigins : true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/quiz-submissions', quizSubmissionsRouter);

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

