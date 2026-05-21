'use client'

// ── src/components/BottomNav.js ──
// Clean 4-tab nav. Bible tab uses a styled BookOpen icon — no special pill, no border.
// Active tab: icon stroked bold + purple label. Inactive: grey.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Map, User } from 'lucide-react'
import { useTheme } from '../lib/theme'

const TABS = [
  { href:'/',        icon:Home,     label:'Home'    },
  { href:'/read',    icon:BookOpen, label:'Bible'   },
  { href:'/plans',   icon:Map,      label:'Plans'   },
  { href:'/profile', icon:User,     label:'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t }    = useTheme()

  const isHidden =
    pathname === '/read' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding')

  if (isHidden) return null

  return (
    <nav
      style={{
        position:            'fixed',
        bottom:               0,
        left:                '50%',
        transform:           'translateX(-50%)',
        width:               '100%',
        maxWidth:             430,
        zIndex:               50,
        display:             'flex',
        alignItems:          'stretch',
        background:           t.bgNav || 'rgba(250,248,245,0.97)',
        borderTop:           `1px solid ${t.border}`,
        boxShadow:           '0 -1px 0 rgba(0,0,0,0.04)',
        backdropFilter:      'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        paddingBottom:       'env(safe-area-inset-bottom, 0px)',
      }}>
      {TABS.map(({ href, icon:Icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname?.startsWith(href)
        return (
          <Link key={href} href={href}
            style={{
              flex:           1,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              justifyContent:'center',
              gap:            3,
              padding:       '10px 4px 10px',
              minHeight:      56,
              color:          active ? '#5B4FCF' : t.textMuted,
              textDecoration:'none',
            }}>
            <Icon
              size={23}
              strokeWidth={active ? 2.5 : 1.75}
              style={{ color: active ? '#5B4FCF' : t.textMuted }}
            />
            <span style={{
              fontSize:      10,
              fontWeight:    active ? 700 : 500,
              letterSpacing: '0.02em',
              lineHeight:    1,
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}