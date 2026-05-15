// ── Root layout — mobile + desktop responsive ──

import './globals.css'
import Script from 'next/script'
import BottomNav from '../components/BottomNav'
import Sidebar from '../components/Sidebar'
import InstallPrompt from '../components/InstallPrompt'
import AppInit from '../components/AppInit'
import OfflineBanner from '../components/OfflineBanner'

export const metadata = {
  title: 'Daily Walk — Your daily devotion, together.',
  description: 'Read your Bible daily. Track your streak. Grow with others.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Daily Walk' },
  icons: { apple: '/icons/icon-192.png', icon: '/icons/favicon-32.png', shortcut: '/icons/favicon-32.png' },
}

export const viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#5B4FCF',
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
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable"            content="yes" />
        <meta name="apple-mobile-web-app-capable"      content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"        content="Daily Walk" />
      </head>
      <body style={{ margin:0, background:'#FAF8F5' }}>
        <OfflineBanner />

        {/*
          ── LAYOUT STRATEGY ──
          Mobile  (<768px): single column, max-w-[420px] centred, BottomNav
          Tablet  (768px+): sidebar + content, max-w-[900px]
          Desktop (1024px+): sidebar + wider content, max-w-[1200px]
        */}
        <div className="flex min-h-screen" style={{ background:'#F0EDE8' }}>
          {/* Desktop/tablet sidebar — hidden on mobile */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex-1 flex justify-center md:justify-start">
            {/*
              Mobile:  centred 420px column, full height, bottom nav
              Desktop: fills remaining space beside sidebar, no bottom nav
            */}
            <div className="
              w-full max-w-[420px]
              md:max-w-none md:w-full
              relative flex flex-col
              bg-warm-bg shadow-2xl md:shadow-none
              min-h-screen
            ">
              <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
                {children}
              </main>

              {/* Bottom nav — mobile only */}
              <div className="md:hidden">
                <BottomNav />
              </div>
            </div>
          </div>
        </div>

        <AppInit />
        <InstallPrompt />
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}