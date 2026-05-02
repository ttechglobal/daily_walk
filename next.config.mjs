// next.config.js — Daily Walk
// Uses next-pwa for service worker + offline support.
// PWA is disabled in development to avoid caching issues during dev.
import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // Cache all network requests — NetworkFirst so live data always preferred
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'daily-walk-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 86400, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})

export default pwaConfig({
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
})