/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence the Turbopack/webpack warning — we have no custom webpack config
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig