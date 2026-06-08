import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc:  'src/app/sw.js',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [
    { url: '/offline', revision: null },
    { url: '/manifest.json', revision: null },
  ],
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dw-pages',
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'dw-google-fonts-stylesheets', expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'dw-google-fonts-webfonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'dw-static', expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'dw-images', expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /^\/icons\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'dw-icons', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: ({ url }) => url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/storage/'),
      handler: 'NetworkFirst',
      options: { cacheName: 'dw-supabase-storage', networkTimeoutSeconds: 6, expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }, cacheableResponse: { statuses: [200] } },
    },
    {
      urlPattern: ({ url }) => url.hostname.endsWith('supabase.co') && !url.pathname.startsWith('/storage/'),
      handler: 'NetworkOnly',
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default withSerwist(nextConfig)