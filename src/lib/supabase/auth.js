// ── lib/supabase/auth.js ──
// Auth operations — gracefully handle missing Supabase config.
// App works fully without account; these only run when Supabase is configured.

import { createClient } from './client'

export async function signUp(email, password, displayName) {
  const sb = createClient()
  if (!sb) return { error: 'Supabase not configured', user: null }
  try {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    })
    return { user: data?.user || null, error: error?.message || null }
  } catch (e) { return { error: String(e), user: null } }
}

export async function signIn(email, password) {
  const sb = createClient()
  if (!sb) return { error: 'Supabase not configured', user: null }
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    return { user: data?.user || null, session: data?.session || null, error: error?.message || null }
  } catch (e) { return { error: String(e), user: null } }
}

export async function signOut() {
  const sb = createClient()
  if (!sb) return
  try { await sb.auth.signOut() } catch {}
}

export async function getSession() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data } = await sb.auth.getSession()
    return data?.session || null
  } catch { return null }
}

export async function getUser() {
  const sb = createClient()
  if (!sb) return null
  try {
    const { data } = await sb.auth.getUser()
    return data?.user || null
  } catch { return null }
}

export async function resetPassword(email) {
  const sb = createClient()
  if (!sb) return { error: 'Supabase not configured' }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email)
    return { error: error?.message || null }
  } catch (e) { return { error: String(e) } }
}