const path = require('path');
const dotenv = require('dotenv');

// Ensure we always load env from server/.env regardless of cwd
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createApp } = require('./app');
const app = createApp();

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

