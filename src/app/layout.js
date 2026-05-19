// ── src/app/layout.js ──
// Server Component — no 'use client' needed or allowed here.
//
// FIX: Removed `next/script` from inside <head>.
// `<Script strategy="beforeInteractive">` inside a Server Component layout
// causes "Encountered a script tag while rendering React component" in Next 16.
// The correct approach for a no-flash dark mode init script is a plain
// <script dangerouslySetInnerHTML> tag directly in <head> — this is the
// officially recommended pattern in Next.js App Router docs.
// `next/script` with `afterInteractive` is still used for sw-register.js
// in <body> where it belongs.

import './globals.css'
import Script        from 'next/script'
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
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Daily Walk' },
  icons: {
    apple:    '/icons/icon-192.png',
    icon:     '/icons/favicon-32.png',
    shortcut: '/icons/favicon-32.png',
  },
}

export const viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#5B4FCF',
}

// Dark mode init script — inlined as a string constant so it's clear
// this runs synchronously before first paint, preventing any flash.
const DARK_MODE_SCRIPT = `try{if(localStorage.getItem('dw_dark_mode')==='true'){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}}catch(e){}`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Plain <script> tag — not next/script.
          This is the correct way to inject a blocking inline script in
          Next.js App Router. It runs before React hydrates, preventing
          the dark mode flash. next/script is for external scripts only.
        */}
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest"         href="/manifest.json" />
        <link rel="icon"             href="/icons/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable"                content="yes" />
        <meta name="apple-mobile-web-app-capable"          content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"            content="Daily Walk" />
      </head>

      <body style={{ margin: 0 }}>
        <DarkModeProvider>
          <AuthGateProvider>
            <OfflineBanner />

            <div
              className="flex min-h-screen"
              style={{ background: 'var(--bg, #FAF8F5)' }}
            >
              <Sidebar />

              <div className="flex-1 min-w-0 flex justify-center md:justify-start">
                <div
                  className="w-full min-w-0 max-w-[430px] md:max-w-none md:w-full relative flex flex-col min-h-screen"
                  style={{ background: 'var(--bg, #FAF8F5)' }}
                >
                  <main className="flex-1" style={{ background: 'var(--bg, #FAF8F5)' }}>
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
          </AuthGateProvider>
        </DarkModeProvider>

        {/* next/script is correct here — external file, non-blocking, in body */}
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}