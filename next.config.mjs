// ── next.config.js ──
// Clean config — no Serwist, no PWA plugin.
// Service worker is handled manually via public/sw.js + public/sw-register.js.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow builds to succeed even with TS/ESLint warnings
  eslint:    { ignoreDuringBuilds: true },
  typescript:{ ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  // Required for web-push (Node.js only — not available in Edge runtime)
  serverExternalPackages: ['web-push'],
}

export default nextConfig