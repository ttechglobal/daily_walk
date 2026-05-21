// ── src/lib/supabase/plans.js ──
// Complete data layer for Shared Bible Reading Plans.
// All mutations go through Supabase. localStorage is used as a fast-read
// cache for the current user's own plans (offline resilience).

import { createClient } from './client'
import { getAuthUser }  from './communities'

// ─────────────────────────────────────────────
//  TEMPLATES — ship with the app
// ─────────────────────────────────────────────
export const PLAN_TEMPLATES = [
  {
    id:           'romans-14',
    name:         'Read Romans Together in 14 Days',
    description:  'Walk through Paul\'s masterpiece on grace, faith, and salvation — one chapter every day.',
    durationDays: 14,
    icon:         '✉️',
    color:        '#5B4FCF',
    days:         Array.from({length:16}, (_,i) => ({
      day_number: i+1, passage_reference: `Romans ${i+1}`,
      book:'Romans', chapter_start:i+1, title:`Romans ${i+1}`,
    })).slice(0,14).map((d,i) => {
      const chap = i+1
      return { ...d, passage_reference:`Romans ${chap}`, chapter_start:chap }
    }),
  },
  {
    id:           'proverbs-30',
    name:         'My Church is Studying Proverbs',
    description:  'One chapter of Proverbs per day — wisdom for everyday life.',
    durationDays: 30,
    icon:         '📖',
    color:        '#4A7C5F',
    days:         Array.from({length:30}, (_,i) => ({
      day_number: i+1, passage_reference:`Proverbs ${i+1}`,
      book:'Proverbs', chapter_start:i+1, title:`Proverbs ${i+1}`,
    })),
  },
  {
    id:           'couples-14',
    name:         'Couples Devotional Challenge',
    description:  'Selected Psalms and Proverbs on love, partnership, and walking with God together.',
    durationDays: 14,
    icon:         '💑',
    color:        '#E84060',
    days:         [
      {day_number:1, passage_reference:'Psalm 1',       book:'Psalms', chapter_start:1, title:'Blessed is the one'},
      {day_number:2, passage_reference:'Proverbs 31:10-31', book:'Proverbs', chapter_start:31, verse_start:10, verse_end:31, title:'A virtuous partner'},
      {day_number:3, passage_reference:'Song of Solomon 2', book:'Song of Solomon', chapter_start:2, title:'His banner over me is love'},
      {day_number:4, passage_reference:'1 Corinthians 13',  book:'1 Corinthians', chapter_start:13, title:'The love chapter'},
      {day_number:5, passage_reference:'Ephesians 5:22-33', book:'Ephesians', chapter_start:5, verse_start:22, verse_end:33, title:'Husbands and wives'},
      {day_number:6, passage_reference:'Psalm 23',          book:'Psalms', chapter_start:23, title:'The Lord is my shepherd'},
      {day_number:7, passage_reference:'Ruth 1',            book:'Ruth', chapter_start:1, title:'Where you go I will go'},
      {day_number:8, passage_reference:'Ruth 2',            book:'Ruth', chapter_start:2, title:'Grace in the fields'},
      {day_number:9, passage_reference:'Psalm 128',         book:'Psalms', chapter_start:128, title:'Blessed is everyone who fears the Lord'},
      {day_number:10, passage_reference:'Colossians 3:12-19', book:'Colossians', chapter_start:3, verse_start:12, verse_end:19, title:'Put on love'},
      {day_number:11, passage_reference:'Proverbs 5:15-23',   book:'Proverbs', chapter_start:5, verse_start:15, verse_end:23, title:'Rejoice in the wife of your youth'},
      {day_number:12, passage_reference:'Genesis 2:18-25',    book:'Genesis', chapter_start:2, verse_start:18, verse_end:25, title:'It is not good to be alone'},
      {day_number:13, passage_reference:'Psalm 37:4',         book:'Psalms', chapter_start:37, verse_start:4, verse_end:4, title:'Delight in the Lord'},
      {day_number:14, passage_reference:'Romans 8:38-39',     book:'Romans', chapter_start:8, verse_start:38, verse_end:39, title:'Nothing can separate us'},
    ],
  },
  {
    id:           '100-day',
    name:         '100-Day Bible Challenge',
    description:  'One hundred days of curated passages from Genesis to Revelation — a journey through the whole story of Scripture.',
    durationDays: 100,
    icon:         '🏆',
    color:        '#E8A838',
    days: [
      {day_number:1, passage_reference:'Genesis 1', book:'Genesis', chapter_start:1, title:'In the beginning'},
      {day_number:2, passage_reference:'Genesis 3', book:'Genesis', chapter_start:3, title:'The fall'},
      {day_number:3, passage_reference:'Genesis 12:1-9', book:'Genesis', chapter_start:12, verse_start:1, verse_end:9, title:'The call of Abraham'},
      {day_number:4, passage_reference:'Exodus 3', book:'Exodus', chapter_start:3, title:'The burning bush'},
      {day_number:5, passage_reference:'Exodus 20', book:'Exodus', chapter_start:20, title:'The Ten Commandments'},
      {day_number:6, passage_reference:'Joshua 1', book:'Joshua', chapter_start:1, title:'Be strong and courageous'},
      {day_number:7, passage_reference:'Ruth 1', book:'Ruth', chapter_start:1, title:'Where you go I will go'},
      {day_number:8, passage_reference:'1 Samuel 17', book:'1 Samuel', chapter_start:17, title:'David and Goliath'},
      {day_number:9, passage_reference:'Psalm 1', book:'Psalms', chapter_start:1, title:'Two paths'},
      {day_number:10, passage_reference:'Psalm 23', book:'Psalms', chapter_start:23, title:'The Lord is my shepherd'},
      {day_number:11, passage_reference:'Psalm 51', book:'Psalms', chapter_start:51, title:'Create in me a clean heart'},
      {day_number:12, passage_reference:'Psalm 91', book:'Psalms', chapter_start:91, title:'He who dwells in shelter'},
      {day_number:13, passage_reference:'Psalm 119:1-40', book:'Psalms', chapter_start:119, verse_start:1, verse_end:40, title:'Blessed are the blameless'},
      {day_number:14, passage_reference:'Proverbs 1', book:'Proverbs', chapter_start:1, title:'The beginning of wisdom'},
      {day_number:15, passage_reference:'Proverbs 3', book:'Proverbs', chapter_start:3, title:'Trust in the Lord'},
      {day_number:16, passage_reference:'Isaiah 40', book:'Isaiah', chapter_start:40, title:'Comfort, comfort my people'},
      {day_number:17, passage_reference:'Isaiah 53', book:'Isaiah', chapter_start:53, title:'The suffering servant'},
      {day_number:18, passage_reference:'Jeremiah 29:11-14', book:'Jeremiah', chapter_start:29, verse_start:11, verse_end:14, title:'Plans to give you hope'},
      {day_number:19, passage_reference:'Daniel 3', book:'Daniel', chapter_start:3, title:'The fiery furnace'},
      {day_number:20, passage_reference:'Daniel 6', book:'Daniel', chapter_start:6, title:'The lion\'s den'},
      {day_number:21, passage_reference:'Matthew 5', book:'Matthew', chapter_start:5, title:'The Sermon on the Mount'},
      {day_number:22, passage_reference:'Matthew 6', book:'Matthew', chapter_start:6, title:'The Lord\'s Prayer'},
      {day_number:23, passage_reference:'Matthew 13', book:'Matthew', chapter_start:13, title:'Parables of the Kingdom'},
      {day_number:24, passage_reference:'Luke 2', book:'Luke', chapter_start:2, title:'The birth of Jesus'},
      {day_number:25, passage_reference:'Luke 15', book:'Luke', chapter_start:15, title:'The prodigal son'},
      {day_number:26, passage_reference:'John 1', book:'John', chapter_start:1, title:'In the beginning was the Word'},
      {day_number:27, passage_reference:'John 3', book:'John', chapter_start:3, title:'You must be born again'},
      {day_number:28, passage_reference:'John 10', book:'John', chapter_start:10, title:'The Good Shepherd'},
      {day_number:29, passage_reference:'John 11', book:'John', chapter_start:11, title:'The resurrection of Lazarus'},
      {day_number:30, passage_reference:'John 14', book:'John', chapter_start:14, title:'I am the way'},
      {day_number:31, passage_reference:'John 15', book:'John', chapter_start:15, title:'Abide in the vine'},
      {day_number:32, passage_reference:'Acts 1', book:'Acts', chapter_start:1, title:'The ascension'},
      {day_number:33, passage_reference:'Acts 2', book:'Acts', chapter_start:2, title:'Pentecost'},
      {day_number:34, passage_reference:'Acts 9', book:'Acts', chapter_start:9, title:'Paul\'s conversion'},
      {day_number:35, passage_reference:'Romans 1', book:'Romans', chapter_start:1, title:'The gospel of God'},
      {day_number:36, passage_reference:'Romans 3', book:'Romans', chapter_start:3, title:'Righteousness through faith'},
      {day_number:37, passage_reference:'Romans 5', book:'Romans', chapter_start:5, title:'Peace with God'},
      {day_number:38, passage_reference:'Romans 6', book:'Romans', chapter_start:6, title:'Dead to sin, alive in Christ'},
      {day_number:39, passage_reference:'Romans 8', book:'Romans', chapter_start:8, title:'Life through the Spirit'},
      {day_number:40, passage_reference:'Romans 12', book:'Romans', chapter_start:12, title:'Living sacrifices'},
      {day_number:41, passage_reference:'1 Corinthians 12', book:'1 Corinthians', chapter_start:12, title:'Spiritual gifts'},
      {day_number:42, passage_reference:'1 Corinthians 13', book:'1 Corinthians', chapter_start:13, title:'The love chapter'},
      {day_number:43, passage_reference:'1 Corinthians 15', book:'1 Corinthians', chapter_start:15, title:'The resurrection'},
      {day_number:44, passage_reference:'2 Corinthians 4', book:'2 Corinthians', chapter_start:4, title:'Jars of clay'},
      {day_number:45, passage_reference:'Galatians 5', book:'Galatians', chapter_start:5, title:'Fruit of the Spirit'},
      {day_number:46, passage_reference:'Ephesians 1', book:'Ephesians', chapter_start:1, title:'Every spiritual blessing'},
      {day_number:47, passage_reference:'Ephesians 2', book:'Ephesians', chapter_start:2, title:'By grace through faith'},
      {day_number:48, passage_reference:'Ephesians 6', book:'Ephesians', chapter_start:6, title:'The armour of God'},
      {day_number:49, passage_reference:'Philippians 2', book:'Philippians', chapter_start:2, title:'The mind of Christ'},
      {day_number:50, passage_reference:'Philippians 4', book:'Philippians', chapter_start:4, title:'Rejoice always'},
      // Days 51-100 continue the pattern through the rest of NT and selected OT
      {day_number:51, passage_reference:'Colossians 1', book:'Colossians', chapter_start:1, title:'The supremacy of Christ'},
      {day_number:52, passage_reference:'Colossians 3', book:'Colossians', chapter_start:3, title:'Set your minds on things above'},
      {day_number:53, passage_reference:'1 Thessalonians 4', book:'1 Thessalonians', chapter_start:4, title:'The coming of the Lord'},
      {day_number:54, passage_reference:'2 Timothy 3', book:'2 Timothy', chapter_start:3, title:'God-breathed Scripture'},
      {day_number:55, passage_reference:'Hebrews 1', book:'Hebrews', chapter_start:1, title:'The Son is the radiance'},
      {day_number:56, passage_reference:'Hebrews 11', book:'Hebrews', chapter_start:11, title:'The hall of faith'},
      {day_number:57, passage_reference:'Hebrews 12', book:'Hebrews', chapter_start:12, title:'Run with endurance'},
      {day_number:58, passage_reference:'James 1', book:'James', chapter_start:1, title:'Trials and wisdom'},
      {day_number:59, passage_reference:'James 2', book:'James', chapter_start:2, title:'Faith and works'},
      {day_number:60, passage_reference:'1 Peter 1', book:'1 Peter', chapter_start:1, title:'Living hope'},
      {day_number:61, passage_reference:'1 Peter 2', book:'1 Peter', chapter_start:2, title:'A chosen people'},
      {day_number:62, passage_reference:'1 John 1', book:'1 John', chapter_start:1, title:'Walk in the light'},
      {day_number:63, passage_reference:'1 John 4', book:'1 John', chapter_start:4, title:'God is love'},
      {day_number:64, passage_reference:'Revelation 1', book:'Revelation', chapter_start:1, title:'The Alpha and Omega'},
      {day_number:65, passage_reference:'Revelation 4', book:'Revelation', chapter_start:4, title:'The throne of God'},
      {day_number:66, passage_reference:'Revelation 21', book:'Revelation', chapter_start:21, title:'A new heaven and earth'},
      {day_number:67, passage_reference:'Revelation 22', book:'Revelation', chapter_start:22, title:'The river of life'},
      // Back to OT highlights
      {day_number:68, passage_reference:'Numbers 6:24-26', book:'Numbers', chapter_start:6, verse_start:24, verse_end:26, title:'The Lord bless you'},
      {day_number:69, passage_reference:'Deuteronomy 6', book:'Deuteronomy', chapter_start:6, title:'Love the Lord your God'},
      {day_number:70, passage_reference:'Joshua 24', book:'Joshua', chapter_start:24, title:'As for me and my house'},
      {day_number:71, passage_reference:'1 Kings 18', book:'1 Kings', chapter_start:18, title:'Elijah and the prophets of Baal'},
      {day_number:72, passage_reference:'Nehemiah 8', book:'Nehemiah', chapter_start:8, title:'Ezra reads the Law'},
      {day_number:73, passage_reference:'Job 38', book:'Job', chapter_start:38, title:'Where were you?'},
      {day_number:74, passage_reference:'Psalm 46', book:'Psalms', chapter_start:46, title:'God is our refuge'},
      {day_number:75, passage_reference:'Psalm 139', book:'Psalms', chapter_start:139, title:'You formed my inward parts'},
      {day_number:76, passage_reference:'Proverbs 31', book:'Proverbs', chapter_start:31, title:'Wisdom\'s worth'},
      {day_number:77, passage_reference:'Ecclesiastes 3', book:'Ecclesiastes', chapter_start:3, title:'A time for everything'},
      {day_number:78, passage_reference:'Isaiah 6', book:'Isaiah', chapter_start:6, title:'Here am I, send me'},
      {day_number:79, passage_reference:'Isaiah 55', book:'Isaiah', chapter_start:55, title:'Come, all who are thirsty'},
      {day_number:80, passage_reference:'Ezekiel 37', book:'Ezekiel', chapter_start:37, title:'The valley of dry bones'},
      {day_number:81, passage_reference:'Hosea 2:14-23', book:'Hosea', chapter_start:2, verse_start:14, verse_end:23, title:'I will allure her'},
      {day_number:82, passage_reference:'Micah 6:8', book:'Micah', chapter_start:6, verse_start:8, verse_end:8, title:'Act justly, love mercy'},
      {day_number:83, passage_reference:'Habakkuk 3', book:'Habakkuk', chapter_start:3, title:'Yet I will rejoice'},
      // More NT
      {day_number:84, passage_reference:'Matthew 26', book:'Matthew', chapter_start:26, title:'The last supper'},
      {day_number:85, passage_reference:'Matthew 27', book:'Matthew', chapter_start:27, title:'The crucifixion'},
      {day_number:86, passage_reference:'Matthew 28', book:'Matthew', chapter_start:28, title:'He is risen'},
      {day_number:87, passage_reference:'Luke 24', book:'Luke', chapter_start:24, title:'The road to Emmaus'},
      {day_number:88, passage_reference:'John 17', book:'John', chapter_start:17, title:'Jesus\' high priestly prayer'},
      {day_number:89, passage_reference:'John 20', book:'John', chapter_start:20, title:'The resurrection appearances'},
      {day_number:90, passage_reference:'Acts 17', book:'Acts', chapter_start:17, title:'Paul in Athens'},
      {day_number:91, passage_reference:'Romans 11', book:'Romans', chapter_start:11, title:'The kindness and severity of God'},
      {day_number:92, passage_reference:'2 Corinthians 12', book:'2 Corinthians', chapter_start:12, title:'My grace is sufficient'},
      {day_number:93, passage_reference:'Titus 3', book:'Titus', chapter_start:3, title:'Saved through mercy'},
      {day_number:94, passage_reference:'Philemon 1', book:'Philemon', chapter_start:1, title:'Paul and Onesimus'},
      {day_number:95, passage_reference:'2 Peter 3', book:'2 Peter', chapter_start:3, title:'The Lord is not slow'},
      {day_number:96, passage_reference:'Jude 1', book:'Jude', chapter_start:1, title:'Contend for the faith'},
      {day_number:97, passage_reference:'Revelation 7', book:'Revelation', chapter_start:7, title:'The great multitude'},
      {day_number:98, passage_reference:'Revelation 12', book:'Revelation', chapter_start:12, title:'The woman and the dragon'},
      {day_number:99, passage_reference:'Revelation 19', book:'Revelation', chapter_start:19, title:'Hallelujah'},
      {day_number:100, passage_reference:'Revelation 22', book:'Revelation', chapter_start:22, title:'Come, Lord Jesus'},
    ],
  },
  {
    id:           'custom',
    name:         '',
    description:  '',
    durationDays: 14,
    icon:         '✏️',
    color:        '#6B7280',
    days:         [],
    isCustom:     true,
  },
]

// ─────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────

export async function createSharedPlan({ name, description, templateId, durationDays, visibility, communityId, startDate, days, inviteCode }) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  if (!sb) throw new Error('Supabase not configured')

  // 1. Create the plan
  // Build insert payload — use provided inviteCode if given, otherwise let DB default generate one
  const insertPayload = {
    name, description, creator_id: authUser.id,
    community_id: communityId || null,
    visibility: visibility || 'public',
    duration_days: durationDays,
    start_date: startDate || new Date().toISOString().split('T')[0],
    status: 'active',
    template_id: templateId || null,
  }
  // Only set invite_code explicitly if provided — otherwise DB default generates it
  if (inviteCode) insertPayload.invite_code = inviteCode

  const { data: plan, error: planErr } = await sb.from('shared_plans').insert(insertPayload)
    .select('id, name, description, creator_id, community_id, visibility, invite_code, start_date, duration_days, status, member_count, template_id, created_at')
    .single()

  if (planErr) {
    console.error('[createSharedPlan] insert error:', planErr.message, planErr.code, planErr.details, planErr.hint)
    throw new Error(planErr.message || 'Failed to create plan')
  }

  // 2. Insert days
  if (days?.length) {
    const dayRows = days.map(d => ({
      plan_id:           plan.id,
      day_number:        d.day_number,
      passage_reference: d.passage_reference,
      book:              d.book || null,
      chapter_start:     d.chapter_start || null,
      verse_start:       d.verse_start || null,
      chapter_end:       d.chapter_end || null,
      verse_end:         d.verse_end || null,
      title:             d.title || null,
      focus:             d.focus || null,
      scheduled_date:    addDays(startDate || new Date().toISOString().split('T')[0], d.day_number - 1),
    }))

    const { error: daysErr } = await sb.from('plan_days').insert(dayRows)
    if (daysErr) throw daysErr
  }

  // 3. Auto-join creator as member (ignore 23505 = already a member)
  const { error: joinErr } = await sb.from('plan_members').insert({
    plan_id: plan.id, user_id: authUser.id,
    current_day: 1, status: 'active',
  })
  if (joinErr && joinErr.code !== '23505') {
    console.warn('[createSharedPlan] auto-join error:', joinErr.message)
  }

  return plan
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─────────────────────────────────────────────
//  READ — Discovery
// ─────────────────────────────────────────────

export async function getPublicPlans({ search, filter, limit = 40, offset = 0 } = {}) {
  const sb = createClient()
  if (!sb) return []

  let query = sb.from('shared_plans')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  switch (filter) {
    case 'most_members': query = query.order('member_count', { ascending: false }); break
    case 'shortest':     query = query.order('duration_days', { ascending: true }); break
    case 'longest':      query = query.order('duration_days', { ascending: false }); break
    default:             query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) { console.error('[getPublicPlans]', error.message); return [] }
  const plans = data || []
  // Fetch creator profiles in one batch
  const creatorIds = [...new Set(plans.map(p => p.creator_id).filter(Boolean))]
  const profiles = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}
  return plans.map(p => normalisePlan({ ...p, profiles: profiles[p.creator_id] || null }))
}

export async function getPlanByInviteCode(code) {
  const sb = createClient()
  if (!sb) return null
  const { data, error } = await sb.from('shared_plans')
    .select('*')
    .eq('invite_code', code.toUpperCase().trim())
    .maybeSingle()
  if (error) { console.error('[getPlanByInviteCode]', error.message); return null }
  if (!data) return null
  const profile = await fetchProfile(sb, data.creator_id)
  return normalisePlan({ ...data, profiles: profile })
}

export async function getPlanById(planId) {
  const sb = createClient()
  if (!sb) return null
  const { data, error } = await sb.from('shared_plans')
    .select('*')
    .eq('id', planId).maybeSingle()
  if (error) { console.error('[getPlanById]', error.message); return null }
  if (!data) return null
  // Fetch creator profile separately — no registered FK to profiles in schema cache
  const profile = await fetchProfile(sb, data.creator_id)
  return normalisePlan({ ...data, profiles: profile })
}

export async function getPlanDays(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_days')
    .select('*').eq('plan_id', planId).order('day_number')
  if (error) { console.error('[getPlanDays]', error.message); return [] }
  return data || []
}

// ─────────────────────────────────────────────
//  READ — Member's plans
// ─────────────────────────────────────────────

export async function getMyPlans() {
  const authUser = await getAuthUser()
  if (!authUser) return []
  const sb = createClient()
  if (!sb) return []

  const { data, error } = await sb.from('plan_members')
    .select('*, shared_plans(*)')
    .eq('user_id', authUser.id)
    .in('status', ['active','paused'])
    .order('joined_at', { ascending: false })

  if (error) { console.error('[getMyPlans]', error.message); return [] }

  const rows = (data || []).filter(r => r.shared_plans)
  // Fetch creator profiles in one batch
  const creatorIds = [...new Set(rows.map(r => r.shared_plans?.creator_id).filter(Boolean))]
  const profiles = creatorIds.length ? await fetchProfiles(sb, creatorIds) : {}
  return rows.map(r => ({
    ...normalisePlan({ ...r.shared_plans, profiles: profiles[r.shared_plans.creator_id] || null }),
    memberStatus:      r.status,
    currentDay:        r.current_day,
    startOffset:       r.start_offset,
    joinedAt:          r.joined_at,
    notifyReads:       r.notify_reads,
    notifyReflections: r.notify_reflections,
  }))
}

export async function getPlanMembers(planId) {
  const sb = createClient()
  if (!sb) return []
  const { data, error } = await sb.from('plan_members')
    .select('user_id, current_day, status, joined_at')
    .eq('plan_id', planId)
    .in('status', ['active','completed'])
    .order('joined_at')
  if (error) { console.error('[getPlanMembers]', error.message); return [] }
  const members = data || []
  // Fetch profiles separately — plan_members.user_id → auth.users, not profiles
  const userIds = members.map(m => m.user_id).filter(Boolean)
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}
  return members.map(m => {
    const p = profiles[m.user_id] || {}
    return {
      userId:     m.user_id,
      name:       p.full_name || p.display_name || p.username || 'Member',
      username:   p.username  || null,
      avatar:     p.avatar_url || null,
      currentDay: m.current_day,
      status:     m.status,
      joinedAt:   m.joined_at,
    }
  })
}

// ─────────────────────────────────────────────
//  JOIN / LEAVE
// ─────────────────────────────────────────────

export async function joinPlan(planId, { fromDay = 1 } = {}) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  // Check already a member
  const { data: existing } = await sb.from('plan_members').select('id,status')
    .eq('plan_id', planId).eq('user_id', authUser.id).maybeSingle()

  if (existing) {
    if (existing.status === 'left') {
      // Re-join
      await sb.from('plan_members').update({ status:'active', current_day: fromDay })
        .eq('plan_id', planId).eq('user_id', authUser.id)
    }
    return // already a member
  }

  await sb.from('plan_members').insert({
    plan_id:      planId,
    user_id:      authUser.id,
    current_day:  fromDay,
    start_offset: fromDay - 1,
    status:       'active',
  })
}

export async function leavePlan(planId) {
  const authUser = await getAuthUser()
  if (!authUser) return
  const sb = createClient()
  await sb.from('plan_members').update({ status: 'left' })
    .eq('plan_id', planId).eq('user_id', authUser.id)
}

// ─────────────────────────────────────────────
//  COMPLETIONS
// ─────────────────────────────────────────────

export async function markDayComplete(planId, dayNumber) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()

  // Upsert completion
  const { error } = await sb.from('daily_completions').upsert({
    plan_id: planId, user_id: authUser.id, day_number: dayNumber,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'plan_id,user_id,day_number', ignoreDuplicates: true })

  if (error) throw error

  // Advance member's current_day via DB function
  const { error: rpcErr } = await sb.rpc('advance_member_day', { p_plan_id: planId, p_user_id: authUser.id })
  if (rpcErr) console.warn('[markDayComplete] advance_member_day:', rpcErr.message)

  return true
}

export async function getMyCompletions(planId) {
  const authUser = await getAuthUser()
  if (!authUser) return new Set()
  const sb = createClient()
  const { data } = await sb.from('daily_completions').select('day_number')
    .eq('plan_id', planId).eq('user_id', authUser.id)
  return new Set((data || []).map(d => d.day_number))
}

export async function getDayCompletionCount(planId, dayNumber) {
  const sb = createClient()
  if (!sb) return 0
  const { count } = await sb.from('daily_completions')
    .select('*', { count:'exact', head:true })
    .eq('plan_id', planId).eq('day_number', dayNumber)
  return count || 0
}

// ─────────────────────────────────────────────
//  REFLECTIONS
// ─────────────────────────────────────────────

export async function postReflection(planId, dayNumber, content) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('plan_reflections').insert({
    plan_id: planId, day_number: dayNumber,
    user_id: authUser.id, content: content.trim().slice(0, 280),
  }).select('id, plan_id, day_number, user_id, content, created_at').single()
  if (error) throw error
  // Fetch the author's own profile for display
  const profile = await fetchProfile(sb, authUser.id)
  return normaliseReflection({ ...data, profiles: profile }, authUser.id)
}

export async function getReflections(planId, dayNumber) {
  const sb = createClient()
  if (!sb) return []
  const authUser = await getAuthUser()
  const { data, error } = await sb.from('plan_reflections')
    .select('id, plan_id, day_number, user_id, content, created_at')
    .eq('plan_id', planId).eq('day_number', dayNumber)
    .order('created_at', { ascending: true })
  if (error) { console.error('[getReflections]', error.message); return [] }

  const rows = data || []
  // Fetch author profiles separately — no FK from plan_reflections to profiles
  const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
  const profiles = userIds.length ? await fetchProfiles(sb, userIds) : {}

  // Fetch which reflections this user has amened
  let amenSet = new Set()
  if (authUser?.id && rows.length) {
    const { data: responses } = await sb.from('reflection_responses')
      .select('reflection_id').eq('user_id', authUser.id).eq('type', 'amen')
      .in('reflection_id', rows.map(r => r.id))
    ;(responses || []).forEach(r => amenSet.add(r.reflection_id))
  }

  return rows.map(r => normaliseReflection(
    { ...r, profiles: profiles[r.user_id] || null },
    authUser?.id, amenSet
  ))
}

export async function deleteReflection(reflectionId) {
  const authUser = await getAuthUser()
  if (!authUser) return
  const sb = createClient()
  await sb.from('plan_reflections').delete()
    .eq('id', reflectionId).eq('user_id', authUser.id)
}

export async function toggleAmenReflection(reflectionId) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data: ex } = await sb.from('reflection_responses').select('id')
    .eq('reflection_id', reflectionId).eq('user_id', authUser.id).eq('type', 'amen').maybeSingle()
  if (ex) {
    await sb.from('reflection_responses').delete()
      .eq('reflection_id', reflectionId).eq('user_id', authUser.id).eq('type', 'amen')
    return false
  } else {
    await sb.from('reflection_responses').insert({
      reflection_id: reflectionId, user_id: authUser.id, type: 'amen',
    })
    return true
  }
}

export async function replyToReflection(reflectionId, content) {
  const authUser = await getAuthUser()
  if (!authUser) throw new Error('not_authenticated')
  const sb = createClient()
  const { data, error } = await sb.from('reflection_responses').insert({
    reflection_id: reflectionId, user_id: authUser.id,
    type: 'reply', content: content.trim().slice(0, 280),
  }).select().single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────

export async function sendPlanNudge(planId, creatorName, planName) {
  await fetch('/api/push/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      type:        'plan_nudge',
      communityId: null,
      planId,
      title:       `${creatorName} is nudging the group`,
      body:        `Time to read today's passage in "${planName}"`,
      url:         `/plans/${planId}`,
    }),
  }).catch(() => null)
}

export async function notifyReadComplete(planId, planName, readerName, dayNumber) {
  await fetch('/api/push/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      type:        'plan_read',
      planId,
      excludeCurrentUser: true,
      title:       planName,
      body:        `${readerName} just finished today's reading`,
      url:         `/plans/${planId}`,
    }),
  }).catch(() => null)
}

// ─────────────────────────────────────────────
//  Normalisers
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  Profile helpers — fetch separately since plan tables have no
//  registered FK to profiles in Supabase's PostgREST schema cache
// ─────────────────────────────────────────────

async function fetchProfile(sb, userId) {
  if (!userId) return null
  const { data } = await sb.from('profiles')
    .select('username, full_name, display_name, avatar_url')
    .eq('id', userId).maybeSingle()
  return data || null
}

async function fetchProfiles(sb, userIds) {
  if (!userIds?.length) return {}
  const { data } = await sb.from('profiles')
    .select('id, username, full_name, display_name, avatar_url')
    .in('id', userIds)
  const map = {}
  for (const p of (data || [])) map[p.id] = p
  return map
}

function normalisePlan(row) {
  const p = row.profiles || {}
  return {
    id:           row.id,
    name:         row.name,
    description:  row.description,
    creatorId:    row.creator_id,
    creatorName:  p.full_name || p.display_name || p.username || 'Someone',
    communityId:  row.community_id,
    visibility:   row.visibility,
    inviteCode:   row.invite_code,
    startDate:    row.start_date,
    durationDays: row.duration_days,
    status:       row.status,
    memberCount:  row.member_count,
    templateId:   row.template_id,
    createdAt:    row.created_at,
  }
}

function normaliseReflection(row, currentUserId, amenSet = new Set()) {
  const p = row.profiles || {}
  return {
    id:          row.id,
    planId:      row.plan_id,
    dayNumber:   row.day_number,
    authorId:    row.user_id,
    authorName:  p.full_name || p.display_name || p.username || 'Anonymous',
    authorUsername: p.username || null,
    authorAvatar:   p.avatar_url || null,
    content:     row.content,
    amened:      amenSet.has(row.id),
    isOwn:       currentUserId === row.user_id,
    createdAt:   row.created_at,
  }
}