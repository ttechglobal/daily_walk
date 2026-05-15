// ─────────────────────────────────────────────────────────────
//  Daily Walk — shared constants and utility functions
//  Update 3: DUMMY_FEED removed. All fake social data gone.
// ─────────────────────────────────────────────────────────────

// ── 30 curated verses, rotated by dayOfYear % 30 ──
export const VERSES = [
  { text: "Your word is a lamp to my feet and a light to my path.", ref: "Psalm 119:105" },
  { text: "Keep this Book of the Law always on your lips; meditate on it day and night.", ref: "Joshua 1:8" },
  { text: "Come near to God and he will come near to you.", ref: "James 4:8" },
  { text: "You will seek me and find me when you seek me with all your heart.", ref: "Jeremiah 29:13" },
  { text: "But when you pray, go into your room, close the door and pray to your Father.", ref: "Matthew 6:6" },
  { text: "Blessed is the one whose delight is in the law of the Lord, and who meditates on his law day and night.", ref: "Psalm 1:1-2" },
  { text: "I have hidden your word in my heart that I might not sin against you.", ref: "Psalm 119:11" },
  { text: "Abide in me, and I in you. As the branch cannot bear fruit by itself, unless it abides in the vine.", ref: "John 15:4" },
  { text: "Draw near to God with a sincere heart and with the full assurance that faith brings.", ref: "Hebrews 10:22" },
  { text: "Do not merely listen to the word, and so deceive yourselves. Do what it says.", ref: "James 1:22" },
  { text: "Let the word of Christ dwell in you richly.", ref: "Colossians 3:16" },
  { text: "This is eternal life: that they know you, the only true God.", ref: "John 17:3" },
  { text: "Be still and know that I am God.", ref: "Psalm 46:10" },
  { text: "The Lord is near to all who call on him in truth.", ref: "Psalm 145:18" },
  { text: "My sheep listen to my voice; I know them, and they follow me.", ref: "John 10:27" },
  { text: "Devote yourselves to prayer, being watchful and thankful.", ref: "Colossians 4:2" },
  { text: "Rejoice always, pray continually, give thanks in all circumstances.", ref: "1 Thessalonians 5:16-18" },
  { text: "I desire to do your will, my God; your law is within my heart.", ref: "Psalm 40:8" },
  { text: "As a deer pants for streams of water, so my soul pants for you, my God.", ref: "Psalm 42:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Seek the Lord while he may be found; call on him while he is near.", ref: "Isaiah 55:6" },
  { text: "Man shall not live on bread alone, but on every word that comes from the mouth of God.", ref: "Matthew 4:4" },
  { text: "The unfolding of your words gives light; it gives understanding to the simple.", ref: "Psalm 119:130" },
  { text: "For the word of God is alive and active, sharper than any double-edged sword.", ref: "Hebrews 4:12" },
  { text: "I am the vine; you are the branches. Remain in me and you will bear much fruit.", ref: "John 15:5" },
  { text: "Ask and it will be given to you; seek and you will find.", ref: "Matthew 7:7" },
  { text: "How sweet are your words to my taste, sweeter than honey to my mouth!", ref: "Psalm 119:103" },
  { text: "Whoever drinks the water I give them will never thirst again.", ref: "John 4:14" },
  { text: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
  { text: "Pray in the Spirit on all occasions with all kinds of prayers and requests.", ref: "Ephesians 6:18" },
]

export function getTodayVerse() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return VERSES[dayOfYear % 30]
}

// ── Local verse image pool ──
// Drop images into /public/verse-images/ named verse-1.jpg, verse-2.jpg, etc.
// The count here should match how many images you've added (default 5 placeholders).
// Update VERSE_IMAGE_COUNT when you add more images.
export const VERSE_IMAGE_COUNT = 5  // ← update this when you add more images

// Date-seeded picker — same image all day, changes tomorrow, never random on re-render
export function getTodayVerseImage() {
  const now   = new Date()
  const seed  = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate()
  const index = (seed % VERSE_IMAGE_COUNT) + 1  // 1-based
  return `/verse-images/verse-${index}.jpg`
}

// Legacy export — no longer used, kept for backwards compat
export const HERO_IMAGES = Array.from({ length: 5 }, (_, i) => `/verse-images/verse-${i+1}.jpg`)

// ── Seed challenges — real default content, NOT fake social data ──
// Update 3: posts arrays start empty. No fake posts.
export const SEED_CHALLENGES = [
  {
    id: 'c1', title: 'Verse a Day — May',
    description: 'Just one verse every day. Simple, consistent, powerful.',
    createdBy: 'Daily Walk Team', type: 'verse-a-day',
    startDate: '2026-05-01', endDate: '2026-05-31',
    joinCount: 0, joined: false, posts: [],
  },
  {
    id: 'c2', title: 'Proverbs in 31 Days',
    description: 'One chapter of Proverbs per day for the whole month.',
    createdBy: 'Daily Walk Team', type: 'chapter-a-day',
    startDate: '2026-05-01', endDate: '2026-05-31',
    joinCount: 0, joined: false, posts: [],
  },
  {
    id: 'c3', title: 'Gospel of John Deep Dive',
    description: 'Read through the Gospel of John together over 3 weeks.',
    createdBy: 'Daily Walk Team', type: 'book',
    startDate: '2026-05-01', endDate: '2026-05-21',
    joinCount: 0, joined: false, posts: [],
  },
  {
    id: 'c4', title: 'Morning Prayer — 7 Days',
    description: 'Commit to 5 minutes of prayer every morning for one week.',
    createdBy: 'Tayo A.', type: 'custom',
    startDate: '2026-05-01', endDate: '2026-05-07',
    joinCount: 0, joined: false, posts: [],
  },
]

export const CHALLENGE_TYPE_LABELS = {
  'verse-a-day':   'Verse a Day',
  'chapter-a-day': 'Chapter a Day',
  'book':          'Full Book',
  'custom':        'Custom',
}

export const CHALLENGE_TYPE_STYLES = {
  'verse-a-day':   'bg-purple-light text-purple',
  'chapter-a-day': 'bg-sage-light text-sage',
  'book':          'bg-amber-light text-amber-700',
  'custom':        'bg-gray-100 text-text-muted',
}

// ── Bible books with chapter counts ──
export const BIBLE_BOOKS = [
  { name: 'Genesis',         chapters: 50  }, { name: 'Exodus',           chapters: 40  },
  { name: 'Leviticus',       chapters: 27  }, { name: 'Numbers',          chapters: 36  },
  { name: 'Deuteronomy',     chapters: 34  }, { name: 'Joshua',           chapters: 24  },
  { name: 'Judges',          chapters: 21  }, { name: 'Ruth',             chapters: 4   },
  { name: '1 Samuel',        chapters: 31  }, { name: '2 Samuel',         chapters: 24  },
  { name: '1 Kings',         chapters: 22  }, { name: '2 Kings',          chapters: 25  },
  { name: '1 Chronicles',    chapters: 29  }, { name: '2 Chronicles',     chapters: 36  },
  { name: 'Ezra',            chapters: 10  }, { name: 'Nehemiah',         chapters: 13  },
  { name: 'Esther',          chapters: 10  }, { name: 'Job',              chapters: 42  },
  { name: 'Psalms',          chapters: 150 }, { name: 'Proverbs',         chapters: 31  },
  { name: 'Ecclesiastes',    chapters: 12  }, { name: 'Song of Solomon',  chapters: 8   },
  { name: 'Isaiah',          chapters: 66  }, { name: 'Jeremiah',         chapters: 52  },
  { name: 'Lamentations',    chapters: 5   }, { name: 'Ezekiel',          chapters: 48  },
  { name: 'Daniel',          chapters: 12  }, { name: 'Hosea',            chapters: 14  },
  { name: 'Joel',            chapters: 3   }, { name: 'Amos',             chapters: 9   },
  { name: 'Obadiah',         chapters: 1   }, { name: 'Jonah',            chapters: 4   },
  { name: 'Micah',           chapters: 7   }, { name: 'Nahum',            chapters: 3   },
  { name: 'Habakkuk',        chapters: 3   }, { name: 'Zephaniah',        chapters: 3   },
  { name: 'Haggai',          chapters: 2   }, { name: 'Zechariah',        chapters: 14  },
  { name: 'Malachi',         chapters: 4   }, { name: 'Matthew',          chapters: 28  },
  { name: 'Mark',            chapters: 16  }, { name: 'Luke',             chapters: 24  },
  { name: 'John',            chapters: 21  }, { name: 'Acts',             chapters: 28  },
  { name: 'Romans',          chapters: 16  }, { name: '1 Corinthians',    chapters: 16  },
  { name: '2 Corinthians',   chapters: 13  }, { name: 'Galatians',        chapters: 6   },
  { name: 'Ephesians',       chapters: 6   }, { name: 'Philippians',      chapters: 4   },
  { name: 'Colossians',      chapters: 4   }, { name: '1 Thessalonians',  chapters: 5   },
  { name: '2 Thessalonians', chapters: 3   }, { name: '1 Timothy',        chapters: 6   },
  { name: '2 Timothy',       chapters: 4   }, { name: 'Titus',            chapters: 3   },
  { name: 'Philemon',        chapters: 1   }, { name: 'Hebrews',          chapters: 13  },
  { name: 'James',           chapters: 5   }, { name: '1 Peter',          chapters: 5   },
  { name: '2 Peter',         chapters: 3   }, { name: '1 John',           chapters: 5   },
  { name: '2 John',          chapters: 1   }, { name: '3 John',           chapters: 1   },
  { name: 'Jude',            chapters: 1   }, { name: 'Revelation',       chapters: 22  },
]

export const BIBLE_TRANSLATIONS = [
  { value: 'kjv', label: 'KJV' },
  { value: 'web', label: 'WEB' },
  { value: 'asv', label: 'ASV' },
  { value: 'bbe', label: 'BBE' },
]

// ── Avatar utilities ──
const AVATAR_COLORS = ['#5B4FCF','#4A7C5F','#E8A838','#E84060','#0B7FAC','#9C5AB8','#3D6B9E','#C0392B']

export function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

// ── Date utilities ──
export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function lastSevenDays() {
  const days = []
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function formatDateLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** Format ISO timestamp as relative time or date */
export function formatTimestamp(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getChallengeProgress(challenge, checkins = []) {
  const start    = new Date(challenge.startDate)
  const end      = new Date(challenge.endDate)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const tagged   = (checkins || []).filter(c => c.challengeId === challenge.id)
  const uniqueDays = new Set(tagged.map(c => c.date)).size
  return { completed: uniqueDays, total: totalDays }
}

// ── Communities seed data (Update 2) ──
// SEED_COMMUNITIES removed — all community data comes from Supabase.
// Two default communities are seeded directly in the database (see schema.sql).
export const SEED_COMMUNITIES = []

export const COMMUNITY_CATEGORIES = ['All', 'Bible Study', 'Prayer', 'Mental Health', 'Youth', 'Worship']

// ── Events seed data (Update 3) ──
export const SEED_EVENTS = [
  { id: 'ev1', title: 'Kingdom Culture Conference', organiser: 'Dominion City',               date: '2026-05-17T09:00:00', location: 'Lagos, Nigeria',  category: 'Conference',   description: 'A gathering of believers to encounter God\'s presence and realign with Kingdom purpose.', online: false, interested: false },
  { id: 'ev2', title: 'Online Prayer Summit',       organiser: 'Daily Walk Community',        date: '2026-05-24T06:00:00', location: 'Online',          category: 'Prayer Night', description: 'Join thousands worldwide for an early morning prayer summit. All are welcome.',           online: true,  interested: false },
  { id: 'ev3', title: 'Youth Revival Night',        organiser: 'House on the Rock',           date: '2026-06-07T18:00:00', location: 'Abuja, Nigeria',  category: 'Revival',      description: 'A night of worship, fire, and encounter for young people.',                               online: false, interested: false },
  { id: 'ev4', title: 'Scripture & Coffee',         organiser: 'Morning Readers Community',   date: '2026-05-31T08:00:00', location: 'Online',          category: 'Bible Study',  description: 'Casual, relaxed Bible discussion over coffee. Join us every last Saturday of the month.',  online: true,  interested: false },
  { id: 'ev5', title: 'Voices of Praise Concert',   organiser: 'Worship Together Community',  date: '2026-06-21T17:00:00', location: 'London, UK',      category: 'Concert',      description: 'An evening of gospel music and worship from artists across the UK.',                      online: false, interested: false },
]

export const EVENT_CATEGORIES = ['Conference', 'Revival', 'Prayer Night', 'Bible Study', 'Concert', 'Other']

/** Format event date nicely: "Sat, May 10 · 4:00 PM" */
export function formatEventDate(isoStr) {
  const d = new Date(isoStr)
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month   = d.toLocaleDateString('en-US', { month: 'short' })
  const day     = d.getDate()
  const time    = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${dayName}, ${month} ${day} · ${time}`
}

// ── Bible characters for character plan ──
export const BIBLE_CHARACTERS = [
  { name: 'David',    description: 'Shepherd, warrior, king, worshipper',           passages: 28 },
  { name: 'Paul',     description: 'Apostle, missionary, theologian',               passages: 24 },
  { name: 'Joseph',   description: 'Dreamer, slave, ruler of Egypt',                passages: 18 },
  { name: 'Moses',    description: 'Deliverer, lawgiver, prophet',                  passages: 22 },
  { name: 'Esther',   description: 'Queen who saved her people',                    passages: 10 },
  { name: 'Ruth',     description: 'Loyalty, redemption, faithfulness',             passages: 8  },
  { name: 'Daniel',   description: 'Prophet, statesman, man of prayer',             passages: 14 },
  { name: 'Peter',    description: 'Fisherman, apostle, rock of the church',        passages: 16 },
  { name: 'Mary',     description: 'Mother of Jesus, woman of faith',               passages: 12 },
  { name: 'Abraham',  description: 'Father of faith, friend of God',                passages: 20 },
  { name: 'Elijah',   description: 'Prophet of fire, man of prayer',                passages: 12 },
  { name: 'Solomon',  description: 'Wisest king, builder of the temple',            passages: 14 },
  { name: 'Job',      description: 'Suffering, faith, and restoration',             passages: 16 },
  { name: 'Isaiah',   description: 'Prophet of redemption and hope',                passages: 18 },
  { name: 'John',     description: 'Beloved disciple, apostle of love',             passages: 14 },
  { name: 'Deborah',  description: 'Judge, prophetess, leader of Israel',           passages: 8  },
]

// ── Suggested topics for topic plan ──
export const SUGGESTED_TOPICS = [
  'Faith','Prayer','Anxiety','Marriage','Purity',
  'Identity','Forgiveness','Purpose','Healing',
  'Addiction','Holiness','Fear','Grief','Wisdom',
]

// ─────────────────────────────────────────────────────────────
//  Slug + shareable link utilities
// ─────────────────────────────────────────────────────────────

/** Turn a string into a URL-safe slug: "Morning Readers" → "morning-readers" */
export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

/** 6-char random suffix for uniqueness */
export function shortId() {
  return Math.random().toString(36).slice(2, 8)
}

/** Build shareable slugs */
export function communitySlug(name, id) {
  return `${slugify(name)}-${id.slice(-6)}`
}
export function postSlug(id) {
  return id.slice(-8)
}
export function planSlug(name, id) {
  return `${slugify(name)}-${id.slice(-6)}`
}

/** Full share URLs */
export const APP_DOMAIN = 'https://dailywalk.app'
export function communityShareUrl(name, id) {
  return `${APP_DOMAIN}/community/${communitySlug(name, id)}`
}
export function postShareUrl(id) {
  return `${APP_DOMAIN}/post/${postSlug(id)}`
}
export function planShareUrl(name, id) {
  return `${APP_DOMAIN}/plan/${planSlug(name, id)}`
}