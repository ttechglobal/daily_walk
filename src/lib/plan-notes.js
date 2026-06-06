// ── src/lib/plan-notes.js ──
// Local-first notes for daily reading.
// Pattern: write to localStorage instantly, sync to Supabase in the background.
// Reads: localStorage first, falls back to Supabase if local is empty.
// Mirrors the pattern used by dw_plans / sync.js throughout the app.

import { createClient } from './supabase/client'

// ─────────────────────────────────────────────
//  Local key convention
//  dw_note_{userId}_{planId}_{dayNumber}
// ─────────────────────────────────────────────
function localKey(userId, planId, dayNumber) {
  return `dw_note_${userId}_${planId}_${dayNumber}`
}

// ─────────────────────────────────────────────
//  Read a note
//  1. Check localStorage
//  2. If empty and userId present, check Supabase
//  Returns '' if nothing found.
// ─────────────────────────────────────────────
export async function getNote(userId, planId, dayNumber) {
  if (!userId || !planId || !dayNumber) return ''

  // 1. Local first
  try {
    const local = localStorage.getItem(localKey(userId, planId, dayNumber))
    if (local !== null) return local // '' is a valid value (cleared note)
  } catch {}

  // 2. Remote fallback
  try {
    const sb = createClient()
    if (!sb) return ''
    const { data } = await sb
      .from('plan_day_notes')
      .select('note_text')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .eq('day_number', dayNumber)
      .maybeSingle()
    if (data?.note_text !== undefined) {
      // Hydrate local cache
      try { localStorage.setItem(localKey(userId, planId, dayNumber), data.note_text) } catch {}
      return data.note_text
    }
  } catch {}

  return ''
}

// ─────────────────────────────────────────────
//  Save a note
//  1. Write to localStorage instantly (sync)
//  2. Fire-and-forget Supabase upsert (async, non-blocking)
// ─────────────────────────────────────────────
export function saveNote(userId, planId, dayNumber, text) {
  if (!userId || !planId || !dayNumber) return

  // 1. Local — instant
  try {
    localStorage.setItem(localKey(userId, planId, dayNumber), text)
  } catch {}

  // 2. Remote — non-blocking
  const sb = createClient()
  if (!sb) return
  sb.from('plan_day_notes')
    .upsert(
      { user_id: userId, plan_id: planId, day_number: dayNumber,
        note_text: text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,plan_id,day_number' }
    )
    .then(({ error }) => {
      if (error) console.warn('[plan-notes] sync failed:', error.message)
    })
}

// ─────────────────────────────────────────────
//  Load all notes for a plan (for plan detail page)
//  Returns a Map: dayNumber → noteText
// ─────────────────────────────────────────────
export async function getAllNotesForPlan(userId, planId) {
  const result = new Map()
  if (!userId || !planId) return result

  // Collect from localStorage
  try {
    const prefix = `dw_note_${userId}_${planId}_`
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        const dayNum = parseInt(key.replace(prefix, ''))
        if (!isNaN(dayNum)) {
          result.set(dayNum, localStorage.getItem(key) || '')
        }
      }
    }
  } catch {}

  // Merge with Supabase (remote may have notes from other devices)
  try {
    const sb = createClient()
    if (!sb) return result
    const { data } = await sb
      .from('plan_day_notes')
      .select('day_number, note_text, updated_at')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .order('day_number')

    for (const row of (data || [])) {
      // Remote wins if local doesn't have it yet
      if (!result.has(row.day_number)) {
        result.set(row.day_number, row.note_text)
        try {
          localStorage.setItem(localKey(userId, planId, row.day_number), row.note_text)
        } catch {}
      }
    }
  } catch {}

  return result
}

// ─────────────────────────────────────────────
//  Sync all dirty local notes to Supabase
//  Call this on app resume / plan page open.
//  "Dirty" = exists in localStorage but may not be in Supabase yet.
// ─────────────────────────────────────────────
export async function syncNotesToSupabase(userId, planId) {
  if (!userId || !planId) return
  const sb = createClient()
  if (!sb) return

  const rows = []
  const prefix = `dw_note_${userId}_${planId}_`

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        const dayNum = parseInt(key.replace(prefix, ''))
        const text   = localStorage.getItem(key) || ''
        if (!isNaN(dayNum)) {
          rows.push({
            user_id:    userId,
            plan_id:    planId,
            day_number: dayNum,
            note_text:  text,
            updated_at: new Date().toISOString(),
          })
        }
      }
    }
  } catch {}

  if (!rows.length) return

  const { error } = await sb
    .from('plan_day_notes')
    .upsert(rows, { onConflict: 'user_id,plan_id,day_number' })

  if (error) console.warn('[plan-notes] bulk sync failed:', error.message)
}