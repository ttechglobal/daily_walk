'use client'

// ── Sidebar — desktop nav (hidden on mobile) ──
// Shows on md+ screens as a left sidebar.
// Mobile keeps BottomNav unchanged.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Map, User, BookOpen } from 'lucide-react'
import { BibleIcon } from './icons/BibleIcon'
import { AppIcon } from './icons/AppIcon'

const NAV_ITEMS = [
  { href: '/',            icon: Home,     label: 'Home'        },
  { href: '/communities', icon: Users,    label: 'Communities' },
  { href: '/read',        icon: BookOpen, label: 'Bible',      special: true },
  { href: '/plans',       icon: Map,      label: 'Plans'       },
  { href: '/profile',     icon: User,     label: 'Profile'     },
]

export default function Sidebar() {
  const pathname = usePathname() || ''

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[240px] flex-shrink-0 border-r"
      style={{ background:'#FAF8F5', borderColor:'#F0EDE8', minHeight:'100dvh',
               position:'sticky', top:0, height:'100dvh', overflowY:'auto' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor:'#F0EDE8' }}>
        <AppIcon size={36} />
        <span className="font-bold text-[18px]" style={{ color:'#1A1A2E', letterSpacing:'-0.02em' }}>
          Daily Walk
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {NAV_ITEMS.map(item => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all group"
              style={{
                background:  active ? '#EDE9FF' : 'transparent',
                color:       active ? '#5B4FCF' : '#6B7280',
                fontWeight:  active ? 700 : 500,
              }}>
              {item.special ? (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: active ? '#5B4FCF' : '#5B4FCF22' }}>
                  <BibleIcon size={14} />
                </div>
              ) : (
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              )}
              <span className="text-[15px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom brand tag */}
      <div className="px-5 py-4 border-t" style={{ borderColor:'#F0EDE8' }}>
        <p className="text-[11px] font-semibold" style={{ color:'#C4C1BC' }}>Daily Walk · Your daily devotion</p>
      </div>
    </aside>
  )
}