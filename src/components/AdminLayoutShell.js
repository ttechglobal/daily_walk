'use client'

// ── src/components/AdminLayoutShell.js ──
// Reads the current pathname.
// If we're on /admin or /admin/*, renders children directly — no consumer chrome.
// Otherwise renders the full consumer app layout (BottomNav, Sidebar, etc.)
//
// This is the cleanest way to have two layout modes in a single Next.js root layout
// without duplicating providers or creating layout conflicts.

import { usePathname } from 'next/navigation'
import BottomNav      from './BottomNav'
import Sidebar        from './Sidebar'
import InstallPrompt  from './InstallPrompt'
import AppInit        from './AppInit'
import OfflineBanner  from './OfflineBanner'
import SwUpdateBanner from './SwUpdateBanner'
import { AuthGateProvider } from './AuthGate'

export default function AdminLayoutShell({ children }) {
  const pathname = usePathname()
  const isAdmin  = pathname?.startsWith('/admin')

  // ── Admin routes: bare render, no consumer chrome ──
  if (isAdmin) {
    return <>{children}</>
  }

  // ── Consumer routes: full app layout ──
  return (
    <AuthGateProvider>
      <SwUpdateBanner />
      <OfflineBanner />

      <div className="flex min-h-screen" style={{ background: 'var(--bg, #FAF8F5)' }}>
        <Sidebar />

        <div className="flex-1 min-w-0 flex justify-center md:justify-start">
          <div
            className="w-full min-w-0 max-w-[430px] md:max-w-none md:w-full relative flex flex-col min-h-screen"
            style={{ background: 'var(--bg, #FAF8F5)' }}>
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
  )
}