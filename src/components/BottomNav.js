'use client'

// ── src/components/BottomNav.js ──
// Fixed to viewport bottom. Dark mode via CSS custom properties.
// Hidden on /read and plan day pages (full-screen reading mode).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Map, User } from 'lucide-react'
import { BibleIcon } from './icons/BibleIcon'
import { useTheme } from '../lib/theme'

const LEFT_ITEMS = [
  { href: '/',            icon: Home,  label: 'Home'        },
  { href: '/communities', icon: Users, label: 'Communities' },
]
const RIGHT_ITEMS = [
  { href: '/plans',   icon: Map,  label: 'Plans'   },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t }    = useTheme()

  const isHidden =
    pathname === '/read' ||
    /^\/plans\/.+\/day\//.test(pathname || '') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding')

  if (isHidden) return null

  return (
    <nav
      aria-label="bottom"
      className="bottom-nav md:hidden"
      style={{
        position:        'fixed',
        bottom:          0,
        left:            '50%',
        transform:       'translateX(-50%)',
        width:           '100%',
        maxWidth:        430,
        zIndex:          50,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-around',
        padding:         '8px 8px 20px',
        background:      t.bgNav,
        borderTop:       `1px solid ${t.border}`,
        boxShadow:       '0 -4px 20px rgba(0,0,0,0.06)',
        backdropFilter:  'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        /* Safe area for iPhone home indicator */
        paddingBottom:   'calc(20px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {LEFT_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors min-w-[48px] min-h-[44px] justify-center"
            style={{ color: isActive ? '#5B4FCF' : t.textMuted }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* Centre Bible button */}
      <Link
        href="/read"
        className="flex items-center justify-center -mt-4 rounded-full text-white transition-all active:scale-95"
        style={{
          width:      56,
          height:     56,
          background: '#5B4FCF',
          boxShadow:  '0 6px 20px rgba(91,79,207,0.5), 0 2px 8px rgba(91,79,207,0.3)',
          flexShrink: 0,
        }}
        aria-label="Open Bible"
      >
        <BibleIcon size={28} color="white" />
      </Link>

      {RIGHT_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors min-w-[48px] min-h-[44px] justify-center"
            style={{ color: isActive ? '#5B4FCF' : t.textMuted }}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}