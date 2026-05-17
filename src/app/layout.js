// ── src/app/layout.js ──
// Global layout:
//   • DarkModeProvider wraps everything (enables useTheme() anywhere)
//   • No-flash script in <head> prevents light flicker on dark-mode reload
//   • AppShell applies dark bg from CSS vars to the root div
//   • BottomNav and Sidebar are rendered here once, not per-page
//   • <main> has pb-20 so content always clears the bottom nav

import './globals.css'
import Script from 'next/script'
import BottomNav     from '../components/BottomNav'
import Sidebar       from '../components/Sidebar'
import InstallPrompt from '../components/InstallPrompt'
import AppInit       from '../components/AppInit'
import OfflineBanner from '../components/OfflineBanner'
import { DarkModeProvider } from '../contexts/DarkModeContext'
import { AuthGateProvider } from '../components/AuthGate'

export const metadata = {
  title:       'Daily Walk — Your daily devotion, together.',
  description: 'Read your Bible daily. Track your streak. Grow with others.',
  manifest:    '/manifest.json',
  appleWebApp: { capable:true, statusBarStyle:'default', title:'Daily Walk' },
  icons: {
    apple:   '/icons/icon-192.png',
    icon:    '/icons/favicon-32.png',
    shortcut:'/icons/favicon-32.png',
  },
}
export const viewport = {
  width:'device-width', initialScale:1, maximumScale:1, themeColor:'#5B4FCF',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No-flash dark mode — must run before first paint, next/script beforeInteractive is correct here */}
        <Script
          id="dark-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('dw_dark_mode')==='true'){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}}catch(e){}` }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest"           href="/manifest.json" />
        <link rel="icon"               href="/icons/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon"   href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable"                content="yes" />
        <meta name="apple-mobile-web-app-capable"          content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"            content="Daily Walk" />
      </head>

      <body style={{ margin: 0 }}>
        <DarkModeProvider>
          <AuthGateProvider>
            <OfflineBanner />

          {/*
            ── LAYOUT STRATEGY ──
            Mobile  (<768px): single max-w-[430px] column, BottomNav at bottom
            Desktop (≥768px): Sidebar on left + content fills remaining space
          */}
          <div
            className="flex min-h-screen"
            style={{ background: 'var(--bg, #FAF8F5)' }}
          >
            {/* Desktop/tablet sidebar — hidden on mobile */}
            <Sidebar />

            {/* Main content column */}
            <div className="flex-1 flex justify-center md:justify-start">
              <div
                className="w-full max-w-[430px] md:max-w-none md:w-full relative flex flex-col min-h-screen"
                style={{ background: 'var(--bg, #FAF8F5)' }}
              >
                {/*
                  <main> is the scrollable region between any sticky page header
                  and the fixed BottomNav.
                  pb-20 = BottomNav height (64px) + 16px safe area buffer.
                  Pages that also have their own sticky header add pt-[60px] or similar.
                */}
                <main className="flex-1" style={{ background: 'var(--bg, #FAF8F5)' }}>
                  {children}
                </main>

                {/* Bottom nav — mobile only, fixed position handled in BottomNav.js */}
                <div className="md:hidden">
                  <BottomNav />
                </div>
              </div>
            </div>
          </div>

          <AppInit />
          <InstallPrompt />
          </AuthGateProvider>
        </DarkModeProvider>

        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}