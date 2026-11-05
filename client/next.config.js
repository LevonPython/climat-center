const { i18n } = require('./next-i18next.config');

// Only this site's Blob store: allowing every store would let anyone spend the monthly resize allowance.
const BLOB_HOST = '8gotroe4rx99wok5.public.blob.vercel-storage.com';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n,
  env: { NEXT_PUBLIC_BLOB_HOST: BLOB_HOST },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: BLOB_HOST, pathname: '/**' }],
    // Vercel counts a resize per photo, width and cache expiry. A stored file never changes, because a
    // replacement gets a new address, so a long cache and few widths stay far below the free allowance.
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 828],
    imageSizes: [384]
  },
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

