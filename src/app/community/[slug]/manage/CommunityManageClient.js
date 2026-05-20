'use client'

// ── src/app/community/[slug]/manage/CommunityManageClient.js ──
// Full community admin management page.
// Receives `slug` as a prop from the server component (page.js).
// Never accesses params directly — that's handled in page.js.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Bell, Save, Trash2, Users, Settings,
  Send, Loader2, Check, Plus,
} from 'lucide-react'
import { useTheme } from '../../../../lib/theme'
import { ToastContainer, showToast } from '../../../../components/Toast'
import {
  getCommunityBySlug, getAuthUser,
  getNotificationTemplates, saveNotificationTemplate, deleteNotificationTemplate,
} from '../../../../lib/supabase/communities'
import { createClient } from '../../../../lib/supabase/client'

const CATEGORIES = ['Bible Study','Prayer','Mental Health','Youth','Worship','General']

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-1">{title}</p>
      {children}
    </div>
  )
}

export default function CommunityManageClient({ slug }) {
  const router = useRouter()
  const { t }  = useTheme()

  const [authUser,   setAuthUser]   = useState(null)
  const [community,  setCommunity]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [forbidden,  setForbidden]  = useState(false)

  // Edit fields
  const [name,       setName]       = useState('')
  const [desc,       setDesc]       = useState('')
  const [category,   setCategory]   = useState('General')
  const [visibility, setVisibility] = useState('public')
  const [saving,     setSaving]     = useState(false)

  // Notification
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody,  setNotifBody]  = useState('')
  const [sending,    setSending]    = useState(false)
  const [templates,  setTemplates]  = useState([])
  const [savingTpl,  setSavingTpl]  = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([getAuthUser(), getCommunityBySlug(slug)]).then(([user, comm]) => {
      if (!user || !comm) { setForbidden(true); setLoading(false); return }
      // Check creator — compare IDs directly
      if (comm.created_by !== user.id) {
        console.warn('[manage] access denied — user:', user.id, 'created_by:', comm.created_by)
        setForbidden(true); setLoading(false); return
      }
      setAuthUser(user)
      setCommunity(comm)
      setName(comm.name || '')
      setDesc(comm.description || '')
      setCategory(comm.category || 'General')
      setVisibility(comm.visibility || 'public')
      setLoading(false)
    }).catch(() => { setForbidden(true); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (!community?.id) return
    getNotificationTemplates(community.id).then(setTemplates).catch(() => null)
  }, [community?.id])

  useEffect(() => {
    if (!community || !authUser) return
    setNotifTitle(`Reminder from ${community.name}`)
    setNotifBody(`Hi, this is ${authUser.name || authUser.username || 'your admin'} from ${community.name}. This is a gentle reminder to read your Bible today. 🙏`)
  }, [community?.id, authUser?.id]) // eslint-disable-line

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('communities').update({
      name: name.trim(), description: desc.trim(), category, visibility,
    }).eq('id', community.id)
    if (error) { showToast('Save failed: ' + error.message); setSaving(false); return }
    setCommunity(c => ({ ...c, name: name.trim(), description: desc.trim(), category, visibility }))
    showToast('Community updated ✓')
    setSaving(false)
  }

  async function handleSendReminder() {
    if (!notifBody.trim()) { showToast('Enter a message first'); return }
    if (!confirm(`Send this reminder to all ${community.member_count || 'your'} members?`)) return
    setSending(true)
    try {
      const res  = await fetch('/api/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'community_remind', communityId: community.id,
          title: notifTitle || `Reminder from ${community.name}`,
          body: notifBody, url: `/community/${community.slug}`,
        }),
      })
      const data = await res.json()
      if (data.success) showToast(`Reminder sent to ${data.sent} member${data.sent !== 1 ? 's' : ''} ✓`)
      else showToast('Send failed: ' + (data.error || data.reason || 'Unknown'))
    } catch { showToast('Network error — try again') }
    finally { setSending(false) }
  }

  async function handleSaveTemplate() {
    if (!notifBody.trim()) return
    setSavingTpl(true)
    try {
      const tpl = await saveNotificationTemplate(community.id, notifTitle || 'Reminder', notifBody)
      setTemplates(prev => [tpl, ...prev])
      showToast('Template saved ✓')
    } catch (e) { showToast('Save failed: ' + e.message) }
    finally { setSavingTpl(false) }
  }

  async function handleDeleteTemplate(id) {
    await deleteNotificationTemplate(id).catch(() => null)
    setTemplates(prev => prev.filter(t => t.id !== id))
    showToast('Template deleted')
  }

  function loadTemplate(tpl) {
    setNotifTitle(tpl.title); setNotifBody(tpl.body)
    showToast('Template loaded')
  }

  async function handleDeleteCommunity() {
    if (!confirm(`Delete "${community.name}"?\n\nThis removes ALL posts and members. Cannot be undone.`)) return
    const sb = createClient()
    const { error } = await sb.from('communities').delete().eq('id', community.id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    showToast('Community deleted')
    router.push('/communities')
  }

  // ── States ──
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-warm-bg">
      <Loader2 size={24} className="text-purple animate-spin" />
    </div>
  )

  if (forbidden) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-warm-bg gap-4 px-6 text-center">
      <div className="text-[40px]">🔒</div>
      <p className="font-bold text-[17px] text-text-primary">Admin access only</p>
      <p className="text-[13px] text-text-muted">Only the community creator can manage this community.</p>
      <button onClick={() => router.back()}
        className="px-5 py-2.5 rounded-full bg-purple text-white font-bold text-[14px]">
        Go back
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-warm-bg">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={18} className="text-text-primary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-[20px] text-text-primary truncate">Manage Community</h1>
          <p className="text-[12px] text-text-muted truncate">{community.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-16 flex flex-col gap-6">

        {/* Stats strip */}
        <div className="bg-white rounded-[18px] shadow-card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-white font-bold text-[20px] bg-purple">
            {(community.name || 'C')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-text-primary truncate">{community.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users size={12} className="text-text-muted" />
              <span className="text-[12px] text-text-muted">{(community.member_count || 0).toLocaleString()} members</span>
            </div>
          </div>
          <button onClick={() => router.push(`/community/${community.slug}`)}
            className="text-[12px] font-semibold text-purple">View</button>
        </div>

        {/* Send Reminder */}
        <Section title="Send Reminder to All Members">
          <div className="bg-white rounded-[18px] shadow-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell size={15} className="text-purple" />
              <p className="font-semibold text-[14px] text-text-primary">Push notification to all members</p>
            </div>
            <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-purple transition-all text-text-primary" />
            <textarea value={notifBody} onChange={e => setNotifBody(e.target.value.slice(0, 300))}
              placeholder="Message…" rows={4}
              className="w-full border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[14px] resize-none focus:outline-none focus:border-purple transition-all text-text-primary" />
            <p className="text-right text-[11px] text-text-muted">{300 - notifBody.length} chars left</p>
            <div className="flex gap-2">
              <button onClick={handleSendReminder} disabled={sending || !notifBody.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-purple text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.97] transition-all">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send now</>}
              </button>
              <button onClick={handleSaveTemplate} disabled={savingTpl || !notifBody.trim()}
                className="flex items-center gap-1.5 px-4 py-3 rounded-full border-2 border-purple text-purple font-bold text-[13px] disabled:opacity-50 active:scale-[0.97] transition-all">
                {savingTpl ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-text-muted px-1">Saved templates</p>
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-white rounded-[14px] shadow-card p-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px] text-text-primary truncate">{tpl.title}</p>
                    <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2">{tpl.body}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => loadTemplate(tpl)}
                      className="text-[11px] font-bold text-purple px-2.5 py-1.5 rounded-full bg-purple-light">
                      Use
                    </button>
                    <button onClick={() => handleDeleteTemplate(tpl.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted active:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Edit Community */}
        <Section title="Community Settings">
          <div className="bg-white rounded-[18px] shadow-card p-4 flex flex-col gap-3">
            <div>
              <label className="text-[12px] font-semibold text-text-muted mb-1 block">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={60}
                className="w-full border border-gray-200 rounded-[12px] px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-purple transition-all text-text-primary" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-text-muted mb-1 block">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={300}
                className="w-full border border-gray-200 rounded-[12px] px-3.5 py-3 text-[14px] resize-none focus:outline-none focus:border-purple transition-all text-text-primary" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-text-muted mb-1 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                      category === cat ? 'bg-purple border-purple text-white' : 'bg-white border-gray-200 text-text-muted'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-text-muted mb-1 block">Visibility</label>
              <div className="flex gap-2">
                {['public','private'].map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    className={`flex-1 py-2.5 rounded-full text-[13px] font-bold border-2 transition-all ${
                      visibility === v ? 'bg-purple border-purple text-white' : 'bg-white border-gray-200 text-text-muted'
                    }`}>
                    {v === 'public' ? '🌐 Public' : '🔒 Private'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="w-full py-3 rounded-full bg-purple text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Check size={15} /> Save changes</>}
            </button>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <div className="bg-red-50 rounded-[18px] p-4 border border-red-100">
            <p className="font-bold text-[14px] text-red-500 mb-1">Delete this community</p>
            <p className="text-[13px] text-red-400 mb-3 leading-relaxed">
              Permanently deletes all posts and removes all members. Cannot be undone.
            </p>
            <button onClick={handleDeleteCommunity}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500 text-white font-bold text-[13px] active:scale-[0.97] transition-all">
              <Trash2 size={14} /> Delete community
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}