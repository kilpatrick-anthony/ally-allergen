// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add assetPrefix for GitHub Codespaces
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // Static asset handling
  images: {
    unoptimized: true,
  },
  
  // Headers for font files
  async headers() {
    return [
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'font/ttf',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig