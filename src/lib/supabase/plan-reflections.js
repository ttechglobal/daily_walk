// ── src/lib/supabase/plan-reflections.js ──
// Shared plan reflections — visible to all members of the plan, hidden from others.
//
// TABLE: plan_reflections
//   id            uuid PK default gen_random_uuid()
//   plan_id       uuid references shared_plans(id) on delete cascade
//   user_id       uuid references profiles(id)
//   day_number    int
//   passage_ref   text          -- e.g. "John 3:16"
//   content       text          -- the reflection text
//   verse_text    text nullable -- optional quoted verse
//   is_question   boolean default false  -- true = "question" type
//   created_at    timestamptz default now()
//
// RLS POLICY (apply in Supabase dashboard):
//   SELECT: auth.uid() IN (
//     SELECT user_id FROM plan_members
//     WHERE plan_id = plan_reflections.plan_id
//     AND status IN ('active','completed')
//   )
//   INSERT: auth.uid() = user_id AND auth.uid() IN (
//     SELECT user_id FROM plan_members WHERE plan_id = plan_reflections.plan_id AND status = 'active'
//   )
//   DELETE: auth.uid() = user_id

import { createClient } from './client'
import { getAuthUser }  from './communities'

// ─────────────────────────────────────────────
//  Get reflections for a plan (visible to members only — RLS enforced)
// ─────────────────────────────────────────────
export async function getPlanReflections(planId, { dayNumber, limit = 50 } = {}) {
  const sb = createClient()
  if (!sb) return []

  let query = sb
    .from('plan_reflections')
    .select(`
      id, plan_id, user_id, day_number, passage_ref,
      content, verse_text, is_question, created_at,
      profiles(id, display_name, username, avatar_url)
    `)
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dayNumber != null) query = query.eq('day_number', dayNumber)

  const { data, error } = await query
  if (error) {
    // RLS block = not a member; return empty gracefully
    if (error.code === 'PGRST116' || error.message?.includes('permission')) return []
    console.error('[getPlanReflections]', error.message)
    return []
  }

  return (data || []).map(normalise)
}

// ─────────────────────────────────────────────
//  Add a reflection
// ─────────────────────────────────────────────
export async function addPlanReflection({
  planId, dayNumber, passageRef, content, verseText, isQuestion = false,
}) {
  if (!content?.trim()) throw new Error('Reflection cannot be empty')
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')

  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const { data, error } = await sb
    .from('plan_reflections')
    .insert({
      plan_id:     planId,
      user_id:     authUser.id,
      day_number:  dayNumber || null,
      passage_ref: passageRef || null,
      content:     content.trim(),
      verse_text:  verseText?.trim() || null,
      is_question: isQuestion,
    })
    .select(`
      id, plan_id, user_id, day_number, passage_ref,
      content, verse_text, is_question, created_at,
      profiles(id, display_name, username, avatar_url)
    `)
    .single()

  if (error) {
    if (error.code === '42501' || error.message?.includes('permission'))
      throw new Error('You must be a member of this plan to share a reflection.')
    throw new Error(error.message || 'Failed to save reflection')
  }

  return normalise(data)
}

// ─────────────────────────────────────────────
//  Delete own reflection
// ─────────────────────────────────────────────
export async function deletePlanReflection(reflectionId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  const { error } = await sb
    .from('plan_reflections')
    .delete()
    .eq('id', reflectionId)
    .eq('user_id', authUser.id) // extra safety — matches RLS

  if (error) throw new Error(error.message || 'Delete failed')
}

// ─────────────────────────────────────────────
//  Real-time subscription
// ─────────────────────────────────────────────
export function subscribeToPlanReflections(planId, callback) {
  const sb = createClient()
  if (!sb) return () => {}

  const channel = sb
    .channel(`plan-reflections-${planId}`)
    .on('postgres_changes', {
      event:  '*',
      schema: 'public',
      table:  'plan_reflections',
      filter: `plan_id=eq.${planId}`,
    }, payload => {
      callback(payload)
    })
    .subscribe()

  return () => sb.removeChannel(channel)
}

// ─────────────────────────────────────────────
//  Normaliser
// ─────────────────────────────────────────────
function normalise(row) {
  const p = row.profiles || {}
  return {
    id:          row.id,
    planId:      row.plan_id,
    userId:      row.user_id,
    dayNumber:   row.day_number,
    passageRef:  row.passage_ref,
    content:     row.content,
    verseText:   row.verse_text,
    isQuestion:  row.is_question,
    createdAt:   row.created_at,
    authorName:  p.display_name || p.username || 'Member',
    authorId:    p.id,
    avatarUrl:   p.avatar_url,
    initials:    (p.display_name || p.username || 'M').slice(0, 2).toUpperCase(),
  }
}