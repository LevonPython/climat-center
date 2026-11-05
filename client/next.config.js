const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n,
  async redirects() {
    return [
      { source: '/am', destination: '/', permanent: true },
      { source: '/am/:path*', destination: '/:path*', permanent: true },
      { source: '/about', destination: '/o-kompanii-centr-klimata', permanent: true },
      { source: '/contacts', destination: '/kontakty', permanent: true },
      { source: '/services', destination: '/uslugi/uslugi-i-servis', permanent: true }
    ];
  }
};

module.exports = nextConfig;

