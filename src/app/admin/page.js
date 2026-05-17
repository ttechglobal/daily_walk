'use client'

// ── src/app/admin/page.js ──
// Replaces the existing localStorage-only admin panel.
// Requires role = 'superadmin' in profiles table — redirects otherwise.
// Desktop: persistent left sidebar. Mobile: hamburger menu.
// All data live from Supabase. No mock data.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Globe, FileText, Bell,
  Settings, Menu, X, LogOut, Trash2, Eye,
  RefreshCw, Plus, Shield, ChevronDown,
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { useTheme } from '../../lib/theme'

// ─────────────────────────────────────────────
//  Auth guard — redirect if not superadmin
// ─────────────────────────────────────────────
function useAdminGuard() {
  const router = useRouter()
  const [ready,  setReady]  = useState(false)
  const [isAdmin,setIsAdmin] = useState(false)

  useEffect(() => {
    async function check() {
      const sb = createClient()
      if (!sb) { router.replace('/'); return }
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/admin/login'); return }
      const { data: profile } = await sb.from('profiles')
        .select('role').eq('id', user.id).single()
      if (profile?.role !== 'superadmin') { router.replace('/admin/login'); return }
      setIsAdmin(true)
      setReady(true)
    }
    check()
  }, []) // eslint-disable-line

  return { ready, isAdmin }
}

// ─────────────────────────────────────────────
//  Table helpers
// ─────────────────────────────────────────────
function Table({ headers, rows, emptyText = 'No data' }) {
  const { t } = useTheme()
  if (!rows.length) return (
    <p className="text-center py-10 text-[13px]" style={{color:t.textFaint}}>{emptyText}</p>
  )
  return (
    <div className="overflow-x-auto rounded-[16px]" style={{border:`1px solid ${t.border}`}}>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr style={{background:t.bgMuted, borderBottom:`1px solid ${t.border}`}}>
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wider"
                style={{color:t.textFaint}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0" style={{borderColor:t.border,background:t.bgCard}}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[13px]" style={{color:t.text}}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const { t } = useTheme()
  return (
    <div className="rounded-[18px] p-5 flex items-center gap-4"
      style={{background:t.bgCard, boxShadow:t.shadow}}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{background:`${color}18`}}>
        <Icon size={22} style={{color}}/>
      </div>
      <div>
        <p className="font-extrabold text-[26px] leading-none" style={{color:t.text}}>{value}</p>
        <p className="text-[12px] mt-1" style={{color:t.textMuted}}>{label}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Dashboard page
// ─────────────────────────────────────────────
function DashboardPage() {
  const { t } = useTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    if (!sb) { setLoading(false); return }
    try {
      // Parallel queries
      const [users, communities, posts, plans] = await Promise.all([
        sb.from('profiles').select('id', {count:'exact',head:true}),
        sb.from('communities').select('id', {count:'exact',head:true}),
        sb.from('posts').select('id', {count:'exact',head:true}).gte('created_at', new Date().toISOString().slice(0,10)),
        sb.from('plans').select('id', {count:'exact',head:true}).eq('status','active'),
      ])
      setStats({
        users:       users.count || 0,
        communities: communities.count || 0,
        postsToday:  posts.count || 0,
        activePlans: plans.count || 0,
      })
    } catch (e) { console.error('[admin]', e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="grid grid-cols-2 gap-4">
      {[1,2,3,4].map(i=>(
        <div key={i} className="rounded-[18px] p-5 h-[88px] animate-pulse"
          style={{background:t.bgCard}}/>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[20px]" style={{color:t.text}}>Dashboard</h2>
          <p className="text-[13px] mt-0.5" style={{color:t.textMuted}}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </p>
        </div>
        <button onClick={load} className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{background:t.bgMuted}}>
          <RefreshCw size={15} style={{color:t.textMuted}}/>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Users}   label="Total users"       value={stats?.users||0}       color="#5B4FCF"/>
        <StatCard icon={Globe}   label="Communities"       value={stats?.communities||0}  color="#4A7C5F"/>
        <StatCard icon={FileText}label="Posts today"       value={stats?.postsToday||0}   color="#E8A838"/>
        <StatCard icon={Settings}label="Active plans"      value={stats?.activePlans||0}  color="#E84060"/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Communities page
// ─────────────────────────────────────────────
function CommunitiesPage() {
  const { t }  = useTheme()
  const router = useRouter()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [creating,setCreating]= useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows, error } = await sb.from('communities')
      .select('id,name,slug,member_count,owner_name,created_at,created_by_admin,is_featured')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!error) setData(rows||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    const sb = createClient()
    const { error } = await sb.from('communities').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    setData(prev => prev.filter(r => r.id !== id))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)
      + '-' + Math.random().toString(36).slice(2,5)
    const { data: row, error } = await sb.from('communities').insert({
      name:             newName.trim(),
      description:      newDesc.trim(),
      slug,
      created_by:       user?.id,
      owner_name:       'Daily Walk App',
      is_featured:      true,
      created_by_admin: true,
      member_count:     0,
    }).select().single()
    if (error) { alert('Error: '+error.message); setSaving(false); return }
    setData(prev => [row, ...prev])
    setNewName(''); setNewDesc(''); setCreating(false)
    setSaving(false)
  }

  const rows = data.map(c => [
    <span className="font-semibold">{c.name}{c.is_featured&&<span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'#EDE9FF',color:'#5B4FCF'}}>Featured</span>}</span>,
    c.slug,
    c.member_count||0,
    c.owner_name||'—',
    new Date(c.created_at).toLocaleDateString(),
    <div className="flex items-center gap-2">
      <button onClick={() => router.push(`/community/${c.slug}`)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold min-h-[32px]"
        style={{background:'#EDE9FF',color:'#5B4FCF'}}>
        <Eye size={12}/> View
      </button>
      <button onClick={() => handleDelete(c.id, c.name)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold min-h-[32px]"
        style={{background:'#FEE2E2',color:'#EF4444'}}>
        <Trash2 size={12}/> Delete
      </button>
    </div>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-[20px]" style={{color:t.text}}>Communities</h2>
        <button onClick={()=>setCreating(v=>!v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-white"
          style={{background:'#5B4FCF'}}>
          <Plus size={14}/> Create Default Community
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            className="rounded-[18px] p-5 flex flex-col gap-3"
            style={{background:t.bgCard,boxShadow:t.shadow}}>
            <p className="font-bold text-[15px]" style={{color:t.text}}>New Default Community</p>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Community name"
              className="w-full px-4 py-3 rounded-[12px] border text-[14px] focus:outline-none"
              style={{background:t.bgInput,color:t.text,borderColor:t.borderInput}}/>
            <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={2}
              placeholder="Short description (optional)"
              className="w-full px-4 py-3 rounded-[12px] border text-[14px] resize-none focus:outline-none"
              style={{background:t.bgInput,color:t.text,borderColor:t.borderInput}}/>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!newName.trim()||saving}
                className="px-5 py-2.5 rounded-full text-white text-[13px] font-bold disabled:opacity-50"
                style={{background:'#5B4FCF'}}>
                {saving?'Creating…':'Create'}
              </button>
              <button onClick={()=>setCreating(false)}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold"
                style={{background:t.bgMuted,color:t.textMuted}}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{background:t.bgCard}}/>
        : <Table headers={['Name','Slug','Members','Owner','Created','Actions']} rows={rows}
            emptyText="No communities yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Users page
// ─────────────────────────────────────────────
function UsersPage() {
  const { t }  = useTheme()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows, error } = await sb.from('profiles')
      .select('id,username,full_name,spiritual_level,heard_from,goals,companion_id,onboarding_complete,role,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setData(rows||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRemove(id, username) {
    if (!window.confirm(`Remove user "${username}"? This will delete their profile data.`)) return
    const sb = createClient()
    await sb.from('profiles').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const rows = data.map(u => [
    <span className="font-mono text-[12px]">@{u.username||'—'}</span>,
    u.full_name||'—',
    u.spiritual_level||'—',
    u.heard_from||'—',
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.role==='superadmin'?'text-purple-600':'text-gray-500'}`}
      style={{background:u.role==='superadmin'?'#EDE9FF':t.bgMuted}}>
      {u.role||'user'}
    </span>,
    new Date(u.created_at).toLocaleDateString(),
    <button onClick={() => handleRemove(u.id, u.username)}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{background:'#FEE2E2',color:'#EF4444'}}>
      <Trash2 size={12}/> Remove
    </button>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[20px]" style={{color:t.text}}>Users</h2>
        <span className="text-[13px]" style={{color:t.textMuted}}>{data.length} total</span>
      </div>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{background:t.bgCard}}/>
        : <Table headers={['Username','Name','Level','Heard from','Role','Joined','Actions']} rows={rows}
            emptyText="No users yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Posts page
// ─────────────────────────────────────────────
function PostsPage() {
  const { t } = useTheme()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows, error } = await sb.from('posts')
      .select('id,content,created_at,user_id,community_id,profiles(username),communities(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setData(rows||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!window.confirm('Delete this post?')) return
    const sb = createClient()
    await sb.from('posts').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const rows = data.map(p => [
    <span className="font-mono text-[12px]">@{p.profiles?.username||'—'}</span>,
    p.communities?.name||'—',
    <span className="line-clamp-2 max-w-[300px]">{p.content}</span>,
    new Date(p.created_at).toLocaleDateString(),
    <button onClick={() => handleDelete(p.id)}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{background:'#FEE2E2',color:'#EF4444'}}>
      <Trash2 size={12}/> Delete
    </button>,
  ])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[20px]" style={{color:t.text}}>Posts</h2>
        <span className="text-[13px]" style={{color:t.textMuted}}>{data.length} shown</span>
      </div>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{background:t.bgCard}}/>
        : <Table headers={['Username','Community','Content','Date','Actions']} rows={rows}
            emptyText="No posts yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Onboarding data page
// ─────────────────────────────────────────────
function OnboardingPage() {
  const { t } = useTheme()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: rows } = await sb.from('profiles')
      .select('username,spiritual_level,heard_from,goals,companion_id,onboarding_complete,created_at')
      .order('created_at',{ascending:false}).limit(200)
    setData(rows||[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = data.map(u => [
    <span className="font-mono text-[12px]">@{u.username||'—'}</span>,
    u.spiritual_level||'—',
    u.heard_from||'—',
    (u.goals||[]).join(', ')||'—',
    u.companion_id||'david',
    u.onboarding_complete?'✓ Done':'Pending',
    new Date(u.created_at).toLocaleDateString(),
  ])

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-bold text-[20px]" style={{color:t.text}}>Onboarding Data</h2>
      <p className="text-[13px]" style={{color:t.textMuted}}>
        Answers from the post-signup onboarding flow.
      </p>
      {loading
        ? <div className="h-40 rounded-[16px] animate-pulse" style={{background:t.bgCard}}/>
        : <Table headers={['Username','Level','Heard From','Goals','Companion','Status','Joined']} rows={rows}
            emptyText="No onboarding data yet"/>
      }
    </div>
  )
}

// ─────────────────────────────────────────────
//  Sidebar nav
// ─────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key:'dashboard',  label:'Dashboard',       icon:LayoutDashboard },
  { key:'communities',label:'Communities',      icon:Globe           },
  { key:'users',      label:'Users',            icon:Users           },
  { key:'posts',      label:'Posts',            icon:FileText        },
  { key:'onboarding', label:'Onboarding Data',  icon:Shield          },
]

function Sidebar({ page, setPage, onClose }) {
  const { t } = useTheme()
  return (
    <div className="flex flex-col h-full py-6 px-3" style={{background:t.bgCard}}>
      <div className="px-3 mb-6">
        <p className="font-display font-bold text-[18px]" style={{color:t.text}}>Daily Walk</p>
        <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{color:'#5B4FCF'}}>Admin Panel</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {SIDEBAR_ITEMS.map(item => (
          <button key={item.key}
            onClick={() => { setPage(item.key); onClose?.() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] font-semibold transition-all text-left min-h-[44px] w-full"
            style={page===item.key
              ? {background:'#5B4FCF',color:'white'}
              : {color:t.textMuted,background:'transparent'}}>
            <item.icon size={17}/>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main admin page
// ─────────────────────────────────────────────
export default function AdminPage() {
  const { ready, isAdmin } = useAdminGuard()
  const { t }     = useTheme()
  const router    = useRouter()
  const [page,    setPage]    = useState('dashboard')
  const [sideOpen,setSideOpen]= useState(false)

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:t.bg}}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{borderColor:'#5B4FCF'}}/>
    </div>
  )
  if (!isAdmin) return null

  const PAGE_COMPONENTS = {
    dashboard:   DashboardPage,
    communities: CommunitiesPage,
    users:       UsersPage,
    posts:       PostsPage,
    onboarding:  OnboardingPage,
  }
  const PageComponent = PAGE_COMPONENTS[page] || DashboardPage

  return (
    <div className="flex min-h-screen" style={{background:t.bg}}>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-56 flex-shrink-0 border-r" style={{borderColor:t.border}}>
        <Sidebar page={page} setPage={setPage}/>
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSideOpen(false)}/>
            <motion.div className="fixed top-0 left-0 bottom-0 w-64 z-[70] md:hidden"
              initial={{x:-64*4}} animate={{x:0}} exit={{x:-64*4}}
              transition={{type:'spring',stiffness:340,damping:36}}>
              <Sidebar page={page} setPage={setPage} onClose={()=>setSideOpen(false)}/>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
          style={{background:t.bgCard,borderColor:t.border}}>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full flex items-center justify-center md:hidden"
              onClick={()=>setSideOpen(true)} style={{background:t.bgMuted}}>
              <Menu size={18} style={{color:t.text}}/>
            </button>
            <div className="md:hidden">
              <p className="font-bold text-[15px]" style={{color:t.text}}>
                {SIDEBAR_ITEMS.find(i=>i.key===page)?.label||'Admin'}
              </p>
            </div>
          </div>
          <button onClick={()=>router.push('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold"
            style={{background:t.bgMuted,color:t.textMuted}}>
            <LogOut size={14}/> Exit Admin
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8" style={{paddingBottom:80}}>
          <PageComponent/>
        </div>
      </div>
    </div>
  )
}