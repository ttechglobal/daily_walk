// ── Root layout — OfflineBanner added (Update 3c) ──

import './globals.css'
import BottomNav from '../components/BottomNav'
import InstallPrompt from '../components/InstallPrompt'
import AppInit from '../components/AppInit'
import Script from 'next/script'
import OfflineBanner from '../components/OfflineBanner'
import '../lib/pwa' // registers beforeinstallprompt at module level

export const metadata = {
  title: 'Daily Walk — Your daily devotion, together.',
  description: 'A spiritual accountability app for Christians.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Daily Walk',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#5B4FCF',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Daily Walk" />
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </head>
      <body className="bg-warm-outer min-h-screen flex justify-center items-start">
        {/* Offline banner — above everything, full width, amber ── */}
        <OfflineBanner />
        <div className="relative w-full max-w-[420px] min-h-screen bg-warm-bg flex flex-col shadow-2xl">
          <main className="flex-1 overflow-y-auto pb-24">
            {children}
          </main>
          <BottomNav />
        </div>
        <AppInit />
        <InstallPrompt />
      </body>
    </html>
  )
}