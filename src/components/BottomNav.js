'use client'

// ── BottomNav — Home | Communities | [BibleIcon→/read] | Plans | Profile ──
// Centre button: custom BibleIcon, raised purple circle 56px, deep shadow.
// Hidden on /read and /plans/*/day/* for focused reading mode.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Map, User } from 'lucide-react'
import { BibleIcon } from './icons/BibleIcon'
import clsx from 'clsx'

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
  const isHidden = pathname === '/read' || /^\/plans\/.+\/day\//.test(pathname || '')
  if (isHidden) return null

  return (
    <nav className="
      md:hidden
      fixed bottom-0 left-1/2 -translate-x-1/2
      w-full max-w-[420px]
      bg-white/95 backdrop-blur-md
      border-t border-gray-100
      flex items-center justify-around
      px-2 pt-2 pb-5 z-50
      shadow-[0_-4px_20px_rgba(0,0,0,0.06)]
    ">
      {LEFT_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href)
        return (
          <Link key={href} href={href}
            className={clsx(
              'flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors',
              isActive ? 'text-purple' : 'text-text-muted hover:text-text-primary'
            )}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={clsx('text-[10px] font-semibold tracking-wide', isActive ? 'text-purple' : 'text-text-muted')}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* ── Centre Bible button — the most important element in the nav ── */}
      <Link
        href="/read"
        className="flex items-center justify-center -mt-4 rounded-full text-white transition-all active:scale-95 hover:opacity-90"
        style={{
          width: 56,
          height: 56,
          background: '#5B4FCF',
          boxShadow: '0 6px 20px rgba(91,79,207,0.5), 0 2px 8px rgba(91,79,207,0.3)',
        }}
        aria-label="Open Bible"
      >
        <BibleIcon size={28} color="white" />
      </Link>

      {RIGHT_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname?.startsWith(href)
        return (
          <Link key={href} href={href}
            className={clsx(
              'flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors',
              isActive ? 'text-purple' : 'text-text-muted hover:text-text-primary'
            )}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={clsx('text-[10px] font-semibold tracking-wide', isActive ? 'text-purple' : 'text-text-muted')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}