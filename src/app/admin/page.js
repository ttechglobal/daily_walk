'use client'

// ── src/app/admin/page.js ──
// KEY FIX: useAdminGuard now uses getSession() instead of getUser().
// getUser() makes a network round-trip to Supabase to verify the JWT — it
// times out if the network is slow or blocked. getSession() reads from
// localStorage instantly (storageKey: 'dw-auth-token') — no network needed.
// We then fetch the profile to confirm role='superadmin', which is a fast
// Supabase DB call (not an auth call).

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Globe, FileText,
  Menu, LogOut, Trash2,
  RefreshCw, Plus, Shield, BookMarked,
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'
import TopicalPlansAdminPage from './topical-plans/page'

// ─────────────────────────────────────────────
//  Auth guard — uses getSession() not getUser()
// ─────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter()
  const [ready,   setReady]   = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const sb = createClient()
        if (!sb) { router.replace('/'); return }

        // getSession() reads from localStorage — no network call, never times out
        const { data: { session } } = await sb.auth.getSession()

        if (!session?.user) {
          router.replace('/admin/login')
          return
        }

        // Profile fetch is a fast DB query — not an auth network call
        const { data: profile } = await sb
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role !== 'superadmin') {
          router.replace('/admin/login')
          return
        }

        setIsAdmin(true)
        setReady(true)
      } catch (e) {
        console.error('[admin] auth check failed:', e.message)
        router.replace('/admin/login')
      }
    }
    check()
  }, []) // eslint-disable-line

  return { ready, isAdmin }
}

// ─────────────────────────────────────────────
//  Table helper
// ─────────────────────────────────────────────
function Table({ headers, rows, emptyText = 'No data' }) {
  const { t } = useTheme()
  if (!rows.length) return (
    <p className="text-center py-10 text-[13px]" style={{ color: t.textFaint }}>
      {emptyText}
    </p>
  )
  return (
    <div className="overflow-x-auto rounded-[16px]"
      style={{ border: `1px solid ${t.border}` }}>
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: t.bgMuted }}>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3 font-semibold"
                style={{ color: t.textMuted }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t"
              style={{ borderColor: t.border, background: i % 2 === 0 ? t.bgCard : t.bg }}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-middle" style={{ color: t.text }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────
function DashboardPage() {
  const { t } = useTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      if (!sb) return
      const [users, communities, plans, topical] = await Promise.all([
        sb.from('profiles').select('id', { count: 'exact', head: true }),
        sb.from('communities').select('id', { count: 'exact', head: true }),
        sb.from('shared_plans').select('id', { count: 'exact', head: true }),
        sb.from('topical_plans').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        users:       users.count       || 0,
        communities: communities.count || 0,
        plans:       plans.count       || 0,
        topical:     topical.count     || 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Users',       value: stats?.users,       color: '#5B4FCF', bg: '#EDE9FF' },
    { label: 'Communities',       value: stats?.communities, color: '#4A7C5F', bg: '#E8F4ED' },
    { label: 'Shared Plans',      value: stats?.plans,       color: '#E8A838', bg: '#FFF4DC' },
    { label: 'Topical Plans',     value: stats?.topical,     color: '#E84060', bg: '#FFF0F3' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-bold text-[22px]" style={{ color: t.text }}>Dashboard</h1>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 rounded-[16px] animate-pulse"
              style={{ background: t.bgCard }}/>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label}
              className="rounded-[16px] p-5 flex flex-col gap-1"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
              <span className="text-[12px] font-semibold" style={{ color: t.textMuted }}>
                {card.label}
              </span>
              <span className="text-[32px] font-bold leading-none" style={{ color: card.color }}>
                {card.value?.toLocaleString() ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Communities
// ─────────────────────────────────────────────
function CommunitiesPage() {
  const { t } = useTheme()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows } = await sb
      .from('communities')
      .select('id, name, slug, member_count, created_at, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(100)
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.map(c => [
    c.name,
    <span className="font-mono text-[12px]">{c.slug}</span>,
    c.member_count || 0,
    <span className="font-mono text-[12px]">@{c.profiles?.username || '—'}</span>,
    new Date(c.created_at).toLocaleDateString(),
    <button
      onClick={async () => {
        if (!confirm(`Delete "${c.name}"?`)) return
        const sb = createClient()
        await sb.from('communities').delete().eq('id', c.id)
        setData(prev => prev.filter(r => r.id !== c.id))
      }}
      className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{ background: '#FEE2E2', color: '#EF4444' }}>
      Delete
    </button>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[20px]" style={{ color: t.text }}>
          Communities
        </h2>
        <button onClick={() => setCreating(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white font-bold text-[13px]"
          style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}>
          <Plus size={14}/> New
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-[16px] p-4 flex flex-col gap-3"
            style={{ background: t.bgCard, border: `1px solid ${t.border}` }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Community name"
              className="px-4 py-3 rounded-[12px] text-[14px] focus:outline-none"
              style={{ background: t.bgMuted, color: t.text, border: `1px solid ${t.border}` }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!newName.trim()) return
                  setSaving(true)
                  const sb = createClient()
                  const slug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  await sb.from('communities').insert({ name: newName.trim(), slug })
                  setNewName('')
                  setCreating(false)
                  setSaving(false)
                  load()
                }}
                disabled={saving}
                className="px-5 py-2.5 rounded-full text-white text-[13px] font-bold"
                style={{ background: '#5B4FCF' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setCreating(false)}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
                style={{ background: t.bgMuted, color: t.textMuted }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{ background: t.bgCard }}/>
        : <Table headers={['Name','Slug','Members','Owner','Created','Actions']} rows={rows}
            emptyText="No communities yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Users
// ─────────────────────────────────────────────
function UsersPage() {
  const { t }  = useTheme()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows } = await sb
      .from('profiles')
      .select('id,username,full_name,spiritual_level,companion_id,onboarding_complete,role,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.map(u => [
    <span className="font-mono text-[12px]">@{u.username || '—'}</span>,
    u.full_name || '—',
    u.companion_id || 'david',
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: u.role === 'superadmin' ? '#EDE9FF' : t.bgMuted,
        color:      u.role === 'superadmin' ? '#5B4FCF' : t.textMuted,
      }}>
      {u.role || 'user'}
    </span>,
    u.onboarding_complete ? '✓' : '—',
    new Date(u.created_at).toLocaleDateString(),
    <button
      onClick={async () => {
        if (!confirm(`Remove "${u.username}"?`)) return
        const sb = createClient()
        await sb.from('profiles').delete().eq('id', u.id)
        setData(prev => prev.filter(r => r.id !== u.id))
      }}
      className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{ background: '#FEE2E2', color: '#EF4444' }}>
      Remove
    </button>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[20px]" style={{ color: t.text }}>Users</h2>
        <span className="text-[13px]" style={{ color: t.textMuted }}>{data.length} total</span>
      </div>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{ background: t.bgCard }}/>
        : <Table headers={['Username','Name','Companion','Role','Onboarded','Joined','Actions']} rows={rows}
            emptyText="No users yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Posts
// ─────────────────────────────────────────────
function PostsPage() {
  const { t } = useTheme()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows } = await sb
      .from('posts')
      .select('id, content, type, created_at, profiles(username), communities(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.map(p => [
    <span className="font-mono text-[12px]">@{p.profiles?.username || '—'}</span>,
    p.communities?.name || '—',
    <span className="max-w-[200px] truncate block">
      {p.content?.slice(0, 80)}{p.content?.length > 80 ? '…' : ''}
    </span>,
    new Date(p.created_at).toLocaleDateString(),
    <button
      onClick={async () => {
        if (!confirm('Delete this post?')) return
        const sb = createClient()
        await sb.from('posts').delete().eq('id', p.id)
        setData(prev => prev.filter(r => r.id !== p.id))
      }}
      className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{ background: '#FEE2E2', color: '#EF4444' }}>
      Delete
    </button>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[20px]" style={{ color: t.text }}>Posts</h2>
        <button onClick={load}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: t.bgMuted }}>
          <RefreshCw size={15} style={{ color: t.textMuted }}/>
        </button>
      </div>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{ background: t.bgCard }}/>
        : <Table headers={['Username','Community','Content','Date','Actions']} rows={rows}
            emptyText="No posts yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Onboarding
// ─────────────────────────────────────────────
function OnboardingPage() {
  const { t } = useTheme()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows } = await sb
      .from('profiles')
      .select('username,spiritual_level,heard_from,goals,companion_id,onboarding_complete,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.map(u => [
    <span className="font-mono text-[12px]">@{u.username || '—'}</span>,
    u.spiritual_level || '—',
    u.heard_from      || '—',
    (u.goals || []).join(', ') || '—',
    u.companion_id    || 'david',
    u.onboarding_complete ? '✓ Done' : 'Pending',
    new Date(u.created_at).toLocaleDateString(),
  ])

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-bold text-[20px]" style={{ color: t.text }}>Onboarding Data</h2>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{ background: t.bgCard }}/>
        : <Table headers={['Username','Level','Heard From','Goals','Companion','Status','Joined']} rows={rows}
            emptyText="No onboarding data yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Sidebar
// ─────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { key: 'communities',   label: 'Communities',   icon: Globe           },
  { key: 'users',         label: 'Users',         icon: Users           },
  { key: 'posts',         label: 'Posts',         icon: FileText        },
  { key: 'onboarding',    label: 'Onboarding',    icon: Shield          },
  { key: 'topical-plans', label: 'Topical Plans', icon: BookMarked      },
]

function Sidebar({ page, setPage, onClose }) {
  const { t } = useTheme()
  return (
    <div className="flex flex-col h-full py-6 px-3" style={{ background: t.bgCard }}>
      <div className="px-3 mb-6">
        <p className="font-display font-bold text-[18px]" style={{ color: t.text }}>Daily Walk</p>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5"
          style={{ color: '#5B4FCF' }}>Admin Panel</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {SIDEBAR_ITEMS.map(item => (
          <button key={item.key}
            onClick={() => { setPage(item.key); onClose?.() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold transition-all text-left min-h-[44px] w-full"
            style={page === item.key
              ? { background: '#5B4FCF', color: 'white' }
              : { color: t.textMuted, background: 'transparent' }}>
            <item.icon size={17}/>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

const PAGE_COMPONENTS = {
  dashboard:       DashboardPage,
  communities:     CommunitiesPage,
  users:           UsersPage,
  posts:           PostsPage,
  onboarding:      OnboardingPage,
  'topical-plans': TopicalPlansAdminPage,
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
export default function AdminPage() {
  const { ready, isAdmin } = useAdminGuard()
  const { t }      = useTheme()
  const router     = useRouter()
  const [page,     setPage]     = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(false)

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#0F1117' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#5B4FCF' }}/>
    </div>
  )
  if (!isAdmin) return null

  const PageComponent = PAGE_COMPONENTS[page] || DashboardPage

  return (
    <div className="flex min-h-screen" style={{ background: t.bg }}>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-56 flex-shrink-0 border-r"
        style={{ borderColor: t.border }}>
        <Sidebar page={page} setPage={setPage}/>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSideOpen(false)}/>
            <motion.div className="fixed top-0 left-0 bottom-0 w-64 z-[70] md:hidden"
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}>
              <Sidebar page={page} setPage={setPage} onClose={() => setSideOpen(false)}/>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
          style={{ background: t.bgCard, borderColor: t.border }}>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center md:hidden"
              onClick={() => setSideOpen(true)} style={{ background: t.bgMuted }}>
              <Menu size={18} style={{ color: t.text }}/>
            </button>
            <p className="font-bold text-[15px] md:hidden" style={{ color: t.text }}>
              {SIDEBAR_ITEMS.find(i => i.key === page)?.label || 'Admin'}
            </p>
          </div>
          <button onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold"
            style={{ background: t.bgMuted, color: t.textMuted }}>
            <LogOut size={14}/> Exit Admin
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8" style={{ paddingBottom: 80 }}>
          <PageComponent/>
        </div>
      </div>
    </div>
  )
}