// // ── src/lib/supabase/qa.js ──
// // Q&A data layer — questions, answers, and "This helped me" reactions.

// import { createClient } from './client'
// import { getAuthUser }  from './communities'

// // ─────────────────────────────────────────────
// //  QUESTIONS
// // ─────────────────────────────────────────────

// export async function getQuestions({ communityId, limit = 40, offset = 0 } = {}) {
//   const sb = createClient()
//   if (!sb) return []

//   const authUser = await getAuthUser()
//   let query = sb.from('qa_questions')
//     .select('*, profiles(username, full_name, display_name, avatar_url)')
//     .order('created_at', { ascending: false })
//     .range(offset, offset + limit - 1)

//   if (communityId) {
//     query = query.eq('community_id', communityId)
//   } else {
//     query = query.eq('is_public', true)
//   }

//   const { data, error } = await query
//   if (error) { console.error('[getQuestions]', error.message); return [] }

//   let helpedSet = new Set()
//   if (authUser?.id && data?.length) {
//     const { data: helped } = await sb.from('qa_helped')
//       .select('target_id')
//       .eq('user_id', authUser.id)
//       .eq('target_type', 'question')
//       .in('target_id', data.map(q => q.id))
//     ;(helped || []).forEach(h => helpedSet.add(h.target_id))
//   }

//   return (data || []).map(q => normaliseQuestion(q, authUser?.id, helpedSet))
// }

// export async function getQuestion(id) {
//   const sb = createClient()
//   if (!sb) return null
//   const authUser = await getAuthUser()
//   const { data, error } = await sb.from('qa_questions')
//     .select('*, profiles(username, full_name, display_name, avatar_url)')
//     .eq('id', id).maybeSingle()
//   if (error || !data) return null
//   let helpedSet = new Set()
//   if (authUser?.id) {
//     const { data: h } = await sb.from('qa_helped').select('target_id')
//       .eq('user_id', authUser.id).eq('target_type', 'question').eq('target_id', id).maybeSingle()
//     if (h) helpedSet.add(id)
//   }
//   return normaliseQuestion(data, authUser?.id, helpedSet)
// }

// export async function askQuestion({ title, body, passage, communityId, isPublic = true }) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()
//   const { data, error } = await sb.from('qa_questions').insert({
//     user_id:      authUser.id,
//     community_id: communityId || null,
//     title:        title.trim(),
//     body:         body?.trim() || null,
//     passage:      passage?.trim() || null,
//     is_public:    isPublic,
//   }).select('*, profiles(username, full_name, display_name, avatar_url)').single()
//   if (error) throw error
//   return normaliseQuestion(data, authUser.id, new Set())
// }

// export async function deleteQuestion(id) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()
//   await sb.from('qa_questions').delete().eq('id', id).eq('user_id', authUser.id)
// }

// // ─────────────────────────────────────────────
// //  ANSWERS
// // ─────────────────────────────────────────────

// export async function getAnswers(questionId) {
//   const sb = createClient()
//   if (!sb) return []
//   const authUser = await getAuthUser()
//   const { data, error } = await sb.from('qa_answers')
//     .select('*, profiles(username, full_name, display_name, avatar_url)')
//     .eq('question_id', questionId)
//     .order('helped_count', { ascending: false })
//     .order('created_at', { ascending: true })
//   if (error) { console.error('[getAnswers]', error.message); return [] }

//   let helpedSet = new Set()
//   if (authUser?.id && data?.length) {
//     const { data: helped } = await sb.from('qa_helped')
//       .select('target_id')
//       .eq('user_id', authUser.id)
//       .eq('target_type', 'answer')
//       .in('target_id', data.map(a => a.id))
//     ;(helped || []).forEach(h => helpedSet.add(h.target_id))
//   }

//   return (data || []).map(a => normaliseAnswer(a, authUser?.id, helpedSet))
// }

// export async function postAnswer({ questionId, body, passage }) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()
//   const { data, error } = await sb.from('qa_answers').insert({
//     question_id: questionId,
//     user_id:     authUser.id,
//     body:        body.trim(),
//     passage:     passage?.trim() || null,
//   }).select('*, profiles(username, full_name, display_name, avatar_url)').single()
//   if (error) throw error
//   // Increment answer count on question
//   sb.from('qa_questions').update({ answer_count: sb.rpc('increment') }).eq('id', questionId).catch(() => null)
//   return normaliseAnswer(data, authUser.id, new Set())
// }

// export async function deleteAnswer(id) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()
//   await sb.from('qa_answers').delete().eq('id', id).eq('user_id', authUser.id)
// }

// // ─────────────────────────────────────────────
// //  "This helped me" — replaces likes
// // ─────────────────────────────────────────────

// export async function toggleHelped(targetType, targetId) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()

//   const { data: existing } = await sb.from('qa_helped').select('id')
//     .eq('user_id', authUser.id).eq('target_type', targetType).eq('target_id', targetId).maybeSingle()

//   const table = targetType === 'question' ? 'qa_questions' : 'qa_answers'

//   if (existing) {
//     await sb.from('qa_helped').delete()
//       .eq('user_id', authUser.id).eq('target_type', targetType).eq('target_id', targetId)
//     await sb.from(table).update({ helped_count: sb.rpc('decrement') }).eq('id', targetId).catch(() => null)
//     return false
//   } else {
//     await sb.from('qa_helped').insert({ user_id: authUser.id, target_type: targetType, target_id: targetId })
//     await sb.from(table).update({ helped_count: sb.rpc('increment') }).eq('id', targetId).catch(() => null)
//     return true
//   }
// }

// // ─────────────────────────────────────────────
// //  AMENS (replaces likes on posts)
// // ─────────────────────────────────────────────

// export async function toggleAmen(postId) {
//   const authUser = await getAuthUser()
//   if (!authUser) throw new Error('not_authenticated')
//   const sb = createClient()

//   const { data: ex } = await sb.from('amens').select('id')
//     .eq('user_id', authUser.id).eq('post_id', postId).maybeSingle()

//   if (ex) {
//     await sb.from('amens').delete().eq('user_id', authUser.id).eq('post_id', postId)
//     return false
//   } else {
//     await sb.from('amens').insert({ user_id: authUser.id, post_id: postId })
//     return true
//   }
// }

// // ─────────────────────────────────────────────
// //  Normalisers
// // ─────────────────────────────────────────────

// function normaliseQuestion(row, currentUserId, helpedSet) {
//   const p = row.profiles || {}
//   return {
//     id:           row.id,
//     communityId:  row.community_id,
//     authorId:     row.user_id,
//     authorName:   p.full_name || p.display_name || p.username || 'Anonymous',
//     authorUsername: p.username || null,
//     authorAvatar: p.avatar_url || null,
//     title:        row.title,
//     body:         row.body,
//     passage:      row.passage,
//     isPublic:     row.is_public,
//     helpedCount:  row.helped_count || 0,
//     answerCount:  row.answer_count || 0,
//     helped:       helpedSet.has(row.id),
//     isOwn:        currentUserId === row.user_id,
//     createdAt:    row.created_at,
//   }
// }

// function normaliseAnswer(row, currentUserId, helpedSet) {
//   const p = row.profiles || {}
//   return {
//     id:             row.id,
//     questionId:     row.question_id,
//     authorId:       row.user_id,
//     authorName:     p.full_name || p.display_name || p.username || 'Anonymous',
//     authorUsername: p.username || null,
//     authorAvatar:   p.avatar_url || null,
//     body:           row.body,
//     passage:        row.passage,
//     helpedCount:    row.helped_count || 0,
//     isAccepted:     row.is_accepted || false,
//     helped:         helpedSet.has(row.id),
//     isOwn:          currentUserId === row.user_id,
//     createdAt:      row.created_at,
//   }
// }