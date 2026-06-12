// ── src/app/layout.js ──
// v5 — Admin routes get clean layout (no BottomNav, Sidebar, AppInit, etc.)
// All other routes get the full consumer app layout unchanged.

import './globals.css'
import Script          from 'next/script'
import BottomNav       from '../components/BottomNav'
import Sidebar         from '../components/Sidebar'
import InstallPrompt   from '../components/InstallPrompt'
import AppInit         from '../components/AppInit'
import OfflineBanner   from '../components/OfflineBanner'
import SwUpdateBanner  from '../components/SwUpdateBanner'
import AdminLayoutShell from '../components/AdminLayoutShell'
import { DarkModeProvider } from '../contexts/DarkModeContext'
import { AuthGateProvider } from '../components/AuthGate'
import { AuthProvider }     from '../contexts/AuthContext'

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

const DARK_MODE_SCRIPT = `try{if(localStorage.getItem('dw_dark_mode')==='true'){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}}catch(e){}`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
          <AuthProvider>
            {/*
              AdminLayoutShell is a client component that reads the current
              pathname and renders EITHER the consumer app chrome OR bare children
              for /admin routes. This avoids double-wrapping providers and keeps
              the root layout as a single server component.
            */}
            <AdminLayoutShell>
              {children}
            </AdminLayoutShell>
          </AuthProvider>
        </DarkModeProvider>

        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}