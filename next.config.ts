import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages must not be bundled — they rely on Node.js internals or
  // have side-effects at import time (e.g. pdf-parse loads test files).
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // Ensure service worker and manifest are accessible
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
