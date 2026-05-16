// ── src/app/layout.js ──
// Root layout — wraps the entire app in DarkModeProvider.
// Adds no-flash inline script to prevent light→dark flicker on reload.
// Fixed header layout structure baked in.

import './globals.css'
import Script from 'next/script'
import BottomNav from '../components/BottomNav'
import Sidebar from '../components/Sidebar'
import InstallPrompt from '../components/InstallPrompt'
import AppInit from '../components/AppInit'
import OfflineBanner from '../components/OfflineBanner'
import { DarkModeProvider } from '../contexts/DarkModeContext'

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
        {/* ── No-flash dark mode script — runs before first paint ── */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('dw_dark_mode') === 'true') {
              document.documentElement.setAttribute('data-theme', 'dark');
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        ` }} />
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
      <body style={{ margin: 0 }}>
        <DarkModeProvider>
          <OfflineBanner />
          <div className="flex min-h-screen" style={{ background: 'var(--dw-bg, #F0EDE8)' }}>
            {/* Desktop/tablet sidebar */}
            <Sidebar />
            {/* Main content column */}
            <div className="flex-1 flex justify-center md:justify-start">
              <div className="w-full max-w-[420px] md:max-w-none md:w-full relative flex flex-col min-h-screen"
                style={{ background: 'var(--dw-bg, #FAF8F5)' }}>
                {/*
                  ── LAYOUT NOTE ──
                  Each page is responsible for its own fixed header via the
                  PageShell component below, OR by using:
                    <header className="app-header"> ... </header>
                    <main className="app-content pb-24"> ... </main>
                  The root <main> here is a simple pass-through.
                */}
                <main className="flex-1">
                  {children}
                </main>
                <div className="md:hidden">
                  <BottomNav />
                </div>
              </div>
            </div>
          </div>
          <AppInit />
          <InstallPrompt />
        </DarkModeProvider>
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}