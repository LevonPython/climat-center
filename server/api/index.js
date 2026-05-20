const path = require('path');
const dotenv = require('dotenv');

// Match server/src/index.js so local `vercel dev` picks up server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createApp } = require('../src/app');

module.exports = createApp();
