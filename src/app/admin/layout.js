'use client'

// ── src/app/admin/layout.js ──
// Dedicated layout for all /admin routes.
// Completely bypasses the main app layout (BottomNav, Sidebar, AuthGate, etc.)
// The admin has its own auth check (useAdminGuard in page.js).
// DarkModeProvider is still included so useTheme() works inside admin pages.

import { DarkModeProvider } from '../../contexts/DarkModeContext'
import { AuthProvider }     from '../../contexts/AuthContext'

export default function AdminLayout({ children }) {
  return (
    <DarkModeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </DarkModeProvider>
  )
}