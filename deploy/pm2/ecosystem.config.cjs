module.exports = {
  apps: [
    {
      name: 'climat-center-api',
      cwd: '/var/www/climat-center/server',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
        // DATABASE_URL, JWT_SECRET, etc come from server/.env loaded by dotenv
      }
    },
    {
      name: 'climat-center-web',
      cwd: '/var/www/climat-center/client',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

