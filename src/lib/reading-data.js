// ── src/lib/reading-data.js ── v3
//
// KEY CHANGES:
//   • Book plans: chapters are the unit. BOOK_PACE_OPTIONS = 1ch/2ch/3ch/custom.
//     booksToContent() now builds a clean content[] of {reference, book, chapter}
//     — one item per chapter. No more "7 passages = 1 chapter" confusion.
//
//   • Topic/Character plans: TOPIC_PACE_OPTIONS has separate verse-level and
//     chapter-level options. topicToContent() and characterToContent() build
//     content[] from the passages array. Each item is {reference, book, chapter, verse?}.
//     The frequency drives how many items per day during reading.
//
//   • Both plan types use the same content model so PlanDetailClient,
//     getSliceForDay, and formatSliceReference work identically for both.
//
//   • generateInviteCode preserved.

// ─────────────────────────────────────────────
//  BIBLE BOOKS
// ─────────────────────────────────────────────
export const BIBLE_BOOKS_FULL = [
  { name:'Genesis',         chapters:50, testament:'OT' },
  { name:'Exodus',          chapters:40, testament:'OT' },
  { name:'Leviticus',       chapters:27, testament:'OT' },
  { name:'Numbers',         chapters:36, testament:'OT' },
  { name:'Deuteronomy',     chapters:34, testament:'OT' },
  { name:'Joshua',          chapters:24, testament:'OT' },
  { name:'Judges',          chapters:21, testament:'OT' },
  { name:'Ruth',            chapters:4,  testament:'OT' },
  { name:'1 Samuel',        chapters:31, testament:'OT' },
  { name:'2 Samuel',        chapters:24, testament:'OT' },
  { name:'1 Kings',         chapters:22, testament:'OT' },
  { name:'2 Kings',         chapters:25, testament:'OT' },
  { name:'1 Chronicles',    chapters:29, testament:'OT' },
  { name:'2 Chronicles',    chapters:36, testament:'OT' },
  { name:'Ezra',            chapters:10, testament:'OT' },
  { name:'Nehemiah',        chapters:13, testament:'OT' },
  { name:'Esther',          chapters:10, testament:'OT' },
  { name:'Job',             chapters:42, testament:'OT' },
  { name:'Psalms',          chapters:150,testament:'OT' },
  { name:'Proverbs',        chapters:31, testament:'OT' },
  { name:'Ecclesiastes',    chapters:12, testament:'OT' },
  { name:'Song of Solomon', chapters:8,  testament:'OT' },
  { name:'Isaiah',          chapters:66, testament:'OT' },
  { name:'Jeremiah',        chapters:52, testament:'OT' },
  { name:'Lamentations',    chapters:5,  testament:'OT' },
  { name:'Ezekiel',         chapters:48, testament:'OT' },
  { name:'Daniel',          chapters:12, testament:'OT' },
  { name:'Hosea',           chapters:14, testament:'OT' },
  { name:'Joel',            chapters:3,  testament:'OT' },
  { name:'Amos',            chapters:9,  testament:'OT' },
  { name:'Obadiah',         chapters:1,  testament:'OT' },
  { name:'Jonah',           chapters:4,  testament:'OT' },
  { name:'Micah',           chapters:7,  testament:'OT' },
  { name:'Nahum',           chapters:3,  testament:'OT' },
  { name:'Habakkuk',        chapters:3,  testament:'OT' },
  { name:'Zephaniah',       chapters:3,  testament:'OT' },
  { name:'Haggai',          chapters:2,  testament:'OT' },
  { name:'Zechariah',       chapters:14, testament:'OT' },
  { name:'Malachi',         chapters:4,  testament:'OT' },
  { name:'Matthew',         chapters:28, testament:'NT' },
  { name:'Mark',            chapters:16, testament:'NT' },
  { name:'Luke',            chapters:24, testament:'NT' },
  { name:'John',            chapters:21, testament:'NT' },
  { name:'Acts',            chapters:28, testament:'NT' },
  { name:'Romans',          chapters:16, testament:'NT' },
  { name:'1 Corinthians',   chapters:16, testament:'NT' },
  { name:'2 Corinthians',   chapters:13, testament:'NT' },
  { name:'Galatians',       chapters:6,  testament:'NT' },
  { name:'Ephesians',       chapters:6,  testament:'NT' },
  { name:'Philippians',     chapters:4,  testament:'NT' },
  { name:'Colossians',      chapters:4,  testament:'NT' },
  { name:'1 Thessalonians', chapters:5,  testament:'NT' },
  { name:'2 Thessalonians', chapters:3,  testament:'NT' },
  { name:'1 Timothy',       chapters:6,  testament:'NT' },
  { name:'2 Timothy',       chapters:4,  testament:'NT' },
  { name:'Titus',           chapters:3,  testament:'NT' },
  { name:'Philemon',        chapters:1,  testament:'NT' },
  { name:'Hebrews',         chapters:13, testament:'NT' },
  { name:'James',           chapters:5,  testament:'NT' },
  { name:'1 Peter',         chapters:5,  testament:'NT' },
  { name:'2 Peter',         chapters:3,  testament:'NT' },
  { name:'1 John',          chapters:5,  testament:'NT' },
  { name:'2 John',          chapters:1,  testament:'NT' },
  { name:'3 John',          chapters:1,  testament:'NT' },
  { name:'Jude',            chapters:1,  testament:'NT' },
  { name:'Revelation',      chapters:22, testament:'NT' },
]

// ─────────────────────────────────────────────
//  BOOK PLAN PACE OPTIONS
//  For read-by-book: unit is always "chapter".
//  Each option says how many chapters to read per day.
// ─────────────────────────────────────────────
export const BOOK_PACE_OPTIONS = [
  { id: '1ch', label: '1 chapter/day',  chaptersPerDay: 1  },
  { id: '2ch', label: '2 chapters/day', chaptersPerDay: 2  },
  { id: '3ch', label: '3 chapters/day', chaptersPerDay: 3  },
]
// Custom pace is handled separately (user types a number)

// ─────────────────────────────────────────────
//  TOPIC/CHARACTER PACE OPTIONS
//  Verse options = how many verse-references per day.
//  Chapter option = group passages by chapter.
// ─────────────────────────────────────────────
export const TOPIC_PACE_OPTIONS = [
  { id: '1v',   label: '1 verse/day',    unit: 'verse',   count: 1 },
  { id: '2v',   label: '2 verses/day',   unit: 'verse',   count: 2 },
  { id: '1ch',  label: '1 chapter/day',  unit: 'chapter', count: 1 },
  { id: '2ch',  label: '2 chapters/day', unit: 'chapter', count: 2 },
]

// ─────────────────────────────────────────────
//  booksToContent — Book plan content builder
//
//  Takes: selectedBooks[], chaptersPerDay (number)
//  Returns: ContentItem[] where each item = one chapter
//    { reference: 'John 1', book: 'John', chapter: 1 }
//
//  The frequency stored in the plan is:
//    { unit: 'chapter', count: chaptersPerDay }
//  getSliceForDay() uses this to group items into days.
// ─────────────────────────────────────────────
export function booksToContent(selectedBooks) {
  const content = []
  for (const book of selectedBooks) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      content.push({
        reference: `${book.name} ${ch}`,
        book:      book.name,
        chapter:   ch,
      })
    }
  }
  return content
}

// Duration helper for book plans
export function calcBookDuration(selectedBooks, chaptersPerDay) {
  if (!selectedBooks?.length || !chaptersPerDay) return 0
  const total = selectedBooks.reduce((s, b) => s + b.chapters, 0)
  return Math.ceil(total / chaptersPerDay)
}

// ─────────────────────────────────────────────
//  topicToContent — Topic/Character content builder
//
//  Takes: passages[]  (each = { ref, title, focus? })
//  Returns: ContentItem[] where each item = one passage
//    { reference: 'John 3:16', book: 'John', chapter: 3, verse: 16, title: '...', focus: '...' }
//
//  The frequency stored in the plan drives grouping:
//    { unit: 'verse', count: 1 }  → 1 passage per day
//    { unit: 'verse', count: 2 }  → 2 passages per day
//    { unit: 'chapter', count: 1 } → all passages from the same chapter, per day
// ─────────────────────────────────────────────
export function topicToContent(passages) {
  return passages.map(p => {
    const parsed = parsePassageRef(p.ref || p.passage || '')
    return {
      reference: p.ref || p.passage || '',
      book:      parsed.book,
      chapter:   parsed.chapter,
      verse:     parsed.verse || null,
      verseEnd:  parsed.verseEnd || null,
      title:     p.title  || null,
      focus:     p.focus  || null,
    }
  }).filter(p => p.book)
}

// ─────────────────────────────────────────────
//  parsePassageRef — parse "John 3:16-17" into parts
// ─────────────────────────────────────────────
export function parsePassageRef(ref) {
  if (!ref) return {}
  const s = String(ref).trim()
  // "Book Chapter:Verse-EndVerse"
  const m = s.match(/^(.+?)\s+(\d+)(?::(\d+)(?:[–\-](\d+))?)?$/)
  if (m) {
    return {
      book:     m[1].trim(),
      chapter:  parseInt(m[2]),
      verse:    m[3] ? parseInt(m[3]) : null,
      verseEnd: m[4] ? parseInt(m[4]) : null,
    }
  }
  return {}
}

// ─────────────────────────────────────────────
//  Duration helpers
// ─────────────────────────────────────────────
export function calcTopicDuration(passages, pace) {
  if (!passages?.length || !pace) return 0
  if (pace.unit === 'verse') return Math.ceil(passages.length / pace.count)
  // chapter unit — count unique chapters
  const chapters = new Set(passages.map(p => {
    const parsed = parsePassageRef(p.ref || p.passage || '')
    return `${parsed.book}::${parsed.chapter}`
  }))
  return Math.ceil(chapters.size / pace.count)
}

// ─────────────────────────────────────────────
//  Legacy compatibility — keep old exports working
// ─────────────────────────────────────────────

// Old booksTodays — still used by create page v2
export const PACE_OPTIONS = [
  { id:'1verse',   label:'1 chapter/day',  passagesPerDay:1  },
  { id:'2verses',  label:'2 chapters/day', passagesPerDay:2  },
  { id:'3verses',  label:'3 chapters/day', passagesPerDay:3  },
]
export function calcDurationFromPace(total, pace) {
  return pace ? Math.ceil(total / (pace.passagesPerDay || pace.count || 1)) : total
}
export function booksTodays(selectedBooks, pace) {
  const content = booksToContent(selectedBooks)
  const perDay  = pace?.passagesPerDay || pace?.chaptersPerDay || 1
  const total   = Math.ceil(content.length / perDay)
  const days    = []
  for (let d = 0; d < total; d++) {
    const slice = content.slice(d * perDay, (d + 1) * perDay)
    const first = slice[0]; const last = slice[slice.length - 1]
    const ref   = slice.length === 1
      ? first.reference
      : first.book === last.book
        ? `${first.book} ${first.chapter}–${last.chapter}`
        : `${first.book} ${first.chapter} – ${last.book} ${last.chapter}`
    days.push({ day_number: d + 1, passage_reference: ref, book: first.book, chapter_start: first.chapter, chapter_end: last.chapter, title: ref })
  }
  return days
}
export function passagesToDays(passages, pace) {
  const perDay = pace?.passagesPerDay || pace?.count || 1
  const days = []
  let dayNum = 1
  for (let i = 0; i < passages.length; i += perDay) {
    const slice = passages.slice(i, i + perDay)
    const refs  = slice.map(p => p.ref || p.passage || p.reference).join(' · ')
    days.push({ day_number: dayNum++, passage_reference: refs, title: slice[0]?.title || `Day ${dayNum}` })
  }
  return days
}
export function topicToDays(topic, pace) {
  return passagesToDays(topic?.passages || [], pace)
}
export function characterToDays(character, pace, sectionId) {
  const passages = sectionId
    ? character?.sections?.find(s => s.id === sectionId)?.passages || character?.passages || []
    : character?.passages || []
  return passagesToDays(passages, pace)
}

// ─────────────────────────────────────────────
//  TOPICS — comprehensive passage sets
//  Each passage: { ref, title, focus }
// ─────────────────────────────────────────────
export const TOPICS = [
  {
    id:'faith', name:'Faith', icon:'🙏', color:'#5B4FCF',
    description:'Trusting God in every season',
    passages:[
      { ref:'Hebrews 11:1',     title:'What faith is',              focus:'Faith is being sure of what we hope for, certain of what we do not see.' },
      { ref:'Romans 10:17',     title:'Faith comes by hearing',     focus:"Faith grows through consistent exposure to God's word." },
      { ref:'Matthew 17:20',    title:'Faith like a mustard seed',  focus:'Even the smallest genuine faith can move what seems impossible.' },
      { ref:'Proverbs 3:5-6',   title:'Trust with all your heart',  focus:"Lean on God's understanding, not your own limited view." },
      { ref:'2 Corinthians 5:7',title:'Walk by faith not sight',    focus:'Living by faith means acting before you can see the full outcome.' },
      { ref:'Isaiah 40:31',     title:'Renew your strength',        focus:'Those who wait on the Lord will soar like eagles.' },
      { ref:'Psalm 46:1-2',     title:'God is our refuge',          focus:'Even when everything shakes, God is a firm foundation.' },
      { ref:'Mark 11:24',       title:'Believe you have received',  focus:'Pray with the expectation that God has already answered.' },
      { ref:'Hebrews 11:6',     title:'Without faith impossible',   focus:'Those who come to God must believe he rewards seekers.' },
      { ref:'Romans 4:20-21',   title:"Abraham's faith",            focus:'He did not waver — fully persuaded God would act.' },
      { ref:'James 1:3',        title:'Testing grows faith',        focus:'Trials are the training ground where faith becomes strong.' },
      { ref:'Matthew 14:28-31', title:'Peter walks on water',       focus:'Faith steps out. Doubt sinks. Keep your eyes on Jesus.' },
      { ref:'Psalm 37:3-4',     title:'Trust and delight',          focus:'Delight in God and he gives you the desires of your heart.' },
      { ref:'Numbers 23:19',    title:'God does not lie',           focus:'Every promise God has spoken, he will fulfil.' },
      { ref:'Lamentations 3:22-23', title:'New every morning',      focus:"God's faithfulness is the ground on which your faith stands." },
      { ref:'Habakkuk 3:17-18', title:'Yet I will rejoice',         focus:'Real faith praises God even before the breakthrough comes.' },
      { ref:'John 11:40',       title:'See the glory of God',       focus:'If you only believe, you will see what God can do.' },
      { ref:'1 John 5:4',       title:'Overcomes the world',        focus:'Your faith is the victory that overcomes every obstacle.' },
      { ref:'Hebrews 12:2',     title:'Fix your eyes on Jesus',     focus:'Jesus is both the author and the finisher of your faith.' },
      { ref:'Revelation 2:10',  title:'Faithful unto the end',      focus:'Hold on. A crown of life awaits those who remain faithful.' },
    ],
  },
  {
    id:'prayer', name:'Prayer', icon:'🕊️', color:'#4A7C5F',
    description:'A deeper conversation with God',
    passages:[
      { ref:'Matthew 6:9-13',   title:'The Lord\'s Prayer',         focus:'Jesus gave us the model — adoration, surrender, petition, protection.' },
      { ref:'Philippians 4:6-7',title:'Prayer and peace',           focus:"When you pray instead of worry, God's peace stands guard." },
      { ref:'1 Thessalonians 5:17', title:'Pray without ceasing',   focus:'Prayer is not a formal act — it is a constant conversation.' },
      { ref:'James 5:16',       title:'Prayer of the righteous',    focus:'Sincere prayer from a right heart is tremendously powerful.' },
      { ref:'Jeremiah 33:3',    title:'Call to me',                 focus:"God's invitation: call to him and he will answer in great ways." },
      { ref:'Luke 18:1-8',      title:'The persistent widow',       focus:"Don't give up. Keep praying. God will bring justice." },
      { ref:'Romans 8:26',      title:'Spirit intercedes',          focus:"When you don't know how to pray, the Spirit prays for you." },
      { ref:'John 15:7',        title:'Ask what you will',          focus:'Abiding in Christ aligns your desires with his will.' },
      { ref:'Matthew 21:22',    title:'Whatever you ask in faith',  focus:'Believing prayer connects to unlimited divine possibility.' },
      { ref:'Psalm 62:8',       title:'Pour out your heart',        focus:'God is a refuge — pour every burden before him.' },
      { ref:'Hebrews 4:16',     title:'Come boldly',                focus:'You can approach God with full confidence and freedom.' },
      { ref:'Isaiah 65:24',     title:'Before you call',            focus:"God already knows what you need before you even ask." },
      { ref:'1 John 5:14-15',   title:'Confidence in prayer',       focus:'If we ask according to his will, he hears and answers.' },
      { ref:'Daniel 6:10',      title:'Daniel prays three times',   focus:'A life of faithful prayer continues even under pressure.' },
      { ref:'Psalm 17:6',       title:'I call to you',              focus:'Simple, direct calling on God is the essence of prayer.' },
    ],
  },
  {
    id:'identity', name:'Identity in Christ', icon:'✨', color:'#E8A838',
    description:'Who you are in God',
    passages:[
      { ref:'John 1:12',        title:'Child of God',               focus:"You have been given the right to be called God's child." },
      { ref:'Ephesians 1:4-5',  title:'Chosen and adopted',         focus:'Before the world began, God chose you and adopted you.' },
      { ref:'2 Corinthians 5:17',title:'New creation',              focus:'Your old self is gone. Everything is new in Christ.' },
      { ref:'1 Peter 2:9',      title:'Chosen and royal',           focus:'You are chosen, royal, holy, and belonging to God.' },
      { ref:'Romans 8:17',      title:'Heirs with Christ',          focus:'You are not just saved — you are a co-heir with Jesus.' },
      { ref:'Galatians 3:26',   title:'Sons of God through faith',  focus:'Faith in Christ gives you full standing as a child of God.' },
      { ref:'Ephesians 2:10',   title:'God\'s masterpiece',         focus:'You are his handiwork, created for good works he prepared.' },
      { ref:'Colossians 2:10',  title:'Complete in Christ',         focus:'In him you are made complete. You lack nothing in Christ.' },
      { ref:'Isaiah 43:1',      title:'I have called you by name',  focus:'You are known, named, and claimed by God himself.' },
      { ref:'Romans 8:1',       title:'No condemnation',            focus:'There is no guilt or shame for those who are in Christ.' },
      { ref:'Zephaniah 3:17',   title:'He delights in you',         focus:'God rejoices over you with singing. You bring him joy.' },
      { ref:'Psalm 139:13-14',  title:'Fearfully and wonderfully made', focus:'Every detail of you was crafted intentionally by God.' },
    ],
  },
  {
    id:'peace', name:'Peace & Anxiety', icon:'🌿', color:'#7CB9E8',
    description:'Replacing worry with God\'s peace',
    passages:[
      { ref:'Philippians 4:6-7',title:'Do not be anxious',          focus:"Prayer brings God's peace beyond all understanding." },
      { ref:'Isaiah 41:10',     title:'Do not fear',                focus:'God promises to strengthen, help, and uphold you.' },
      { ref:'John 14:27',       title:'My peace I give you',        focus:'The peace Jesus gives is unlike anything the world offers.' },
      { ref:'Psalm 23:4',       title:'Through the valley',         focus:'Even in your darkest season, God walks beside you.' },
      { ref:'1 Peter 5:7',      title:'Cast your anxiety',          focus:'God invites you to give every worry to him.' },
      { ref:'Matthew 6:34',     title:'Do not worry about tomorrow',focus:'Anxiety lives in the future. God meets you in the present.' },
      { ref:'Psalm 46:10',      title:'Be still and know',          focus:'Sometimes the most faithful act is to stop striving and rest.' },
      { ref:'2 Timothy 1:7',    title:'Spirit of power',            focus:'Fear is not from God. Power, love, and clarity are.' },
      { ref:'Isaiah 26:3',      title:'Perfect peace',              focus:'Fix your mind on God and he keeps you in perfect peace.' },
      { ref:'Romans 5:1',       title:'Peace with God',             focus:'Through faith you have full peace with your Creator.' },
      { ref:'Psalm 34:4',       title:'He delivered me',            focus:'Seek God honestly and he will free you from your fears.' },
      { ref:'Matthew 11:28-30', title:'Come to me',                 focus:'Jesus personally invites the burdened to rest in him.' },
    ],
  },
  {
    id:'salvation', name:'Salvation', icon:'🌅', color:'#4A7C5F',
    description:'Understanding the gift of new life',
    passages:[
      { ref:'John 3:16-17',     title:'God so loved the world',     focus:"The foundation — God's love and the gift of salvation." },
      { ref:'Romans 3:23',      title:'All have sinned',            focus:'Every person falls short — that is why we need a Saviour.' },
      { ref:'Romans 6:23',      title:'Gift of eternal life',       focus:'Sin leads to death, but God\'s free gift is eternal life.' },
      { ref:'Romans 5:8',       title:'While we were still sinners',focus:'God demonstrated his love by sending Christ for us first.' },
      { ref:'Ephesians 2:8-9',  title:'Saved by grace',             focus:'Salvation is entirely a gift — not earned, not deserved.' },
      { ref:'Romans 10:9-10',   title:'Confess and believe',        focus:'Confess Jesus as Lord and believe in your heart.' },
      { ref:'John 1:12',        title:'Right to become children',   focus:'All who receive Christ receive the right to become children of God.' },
      { ref:'Titus 3:5',        title:'He saved us',                focus:'Not because of righteous things we did — but by his mercy.' },
      { ref:'Hebrews 7:25',     title:'He saves completely',        focus:'Christ is able to save completely those who come to God through him.' },
      { ref:'1 John 5:11-12',   title:'Life is in the Son',         focus:'Who has the Son has life. It is that simple and that clear.' },
    ],
  },
  {
    id:'wisdom', name:'Wisdom', icon:'💡', color:'#E8A838',
    description:'Walking in God\'s understanding',
    passages:[
      { ref:'Proverbs 1:7',     title:'Fear of the Lord',           focus:'The beginning of all wisdom is reverence for God.' },
      { ref:'James 1:5',        title:'Ask for wisdom',             focus:'God gives wisdom generously to all who ask in faith.' },
      { ref:'Proverbs 3:5-7',   title:'Trust in the Lord',          focus:"Lean on God's understanding, not your own." },
      { ref:'Ecclesiastes 12:13',title:'The conclusion of the matter',focus:'Fear God and keep his commandments — this is the whole duty of humankind.' },
      { ref:'Psalm 111:10',     title:'Wisdom begins here',         focus:'Understanding comes to those who revere and obey God.' },
      { ref:'Colossians 3:16',  title:'Let the word dwell',         focus:'Let Scripture live in you richly as the source of all wisdom.' },
      { ref:'Romans 11:33',     title:'Depth of riches',            focus:"God's wisdom and knowledge are unsearchable and beyond our finding." },
      { ref:'Proverbs 4:7',     title:'Get wisdom',                 focus:"Though it cost everything, get wisdom — it's the principal thing." },
      { ref:'Isaiah 55:8-9',    title:'My ways higher than yours',  focus:"God's thoughts and plans operate at a different level altogether." },
      { ref:'1 Corinthians 1:25',title:'Foolishness of God',        focus:"What seems foolish to the world is wiser than human wisdom." },
    ],
  },
]

// ─────────────────────────────────────────────
//  CHARACTERS — full story arcs
// ─────────────────────────────────────────────
export const CHARACTERS = [
  {
    id:'david', name:'David', icon:'👑', color:'#E8A838',
    description:'Shepherd, warrior, king, poet — a man after God\'s own heart',
    passages:[
      { ref:'1 Samuel 16:7',  title:'God looks at the heart',      focus:'David was chosen not for appearance but for his heart.' },
      { ref:'1 Samuel 17:45', title:'David vs Goliath',            focus:'David faced giants with the name of God, not weapons.' },
      { ref:'Psalm 23:1-4',   title:'The Lord is my shepherd',     focus:"David's most beloved psalm — God's personal care." },
      { ref:'2 Samuel 7:18',  title:'Who am I, Lord?',             focus:'David\'s humility before God\'s extraordinary promise.' },
      { ref:'Psalm 51:1-4',   title:'Create in me a clean heart',  focus:'David\'s honest repentance after failing God.' },
      { ref:'Acts 13:22',     title:'Man after God\'s own heart',  focus:"God's own testimony about David's character." },
      { ref:'Psalm 27:1',     title:'The Lord is my light',        focus:'David declared God\'s sufficiency even in danger.' },
      { ref:'2 Samuel 9:1-3', title:'Is there anyone left?',       focus:'David\'s kindness to Mephibosheth — a picture of grace.' },
    ],
  },
  {
    id:'paul', name:'Paul', icon:'✍️', color:'#5B4FCF',
    description:'From persecutor to apostle — grace transforming a life',
    passages:[
      { ref:'Acts 9:3-6',       title:'Paul\'s conversion',         focus:'A dramatic encounter with Jesus changed everything.' },
      { ref:'Philippians 3:7-8',title:'Counting it all loss',       focus:'Paul considered his whole former life worthless compared to Christ.' },
      { ref:'Galatians 1:15-16',title:'Set apart from birth',       focus:"Paul understood his whole story was part of God's plan." },
      { ref:'2 Corinthians 11:23-27', title:'Paul\'s sufferings',   focus:'He listed his hardships not to complain but to prove grace.' },
      { ref:'2 Timothy 4:7',    title:'I have fought the good fight',focus:'Paul\'s final testimony from prison — full of peace.' },
      { ref:'Romans 8:38-39',   title:'Nothing can separate us',    focus:"Paul's unshakeable confidence in God's love." },
      { ref:'Philippians 4:11', title:'I have learned contentment', focus:'Contentment was learned through experience, not given.' },
      { ref:'Ephesians 3:8',    title:'Less than the least',        focus:'The greatest apostle still saw himself as the least deserving.' },
    ],
  },
  {
    id:'esther', name:'Esther', icon:'👸', color:'#E84060',
    description:'For such a time as this — courage at the moment of calling',
    passages:[
      { ref:'Esther 2:17',     title:'Esther found favour',         focus:'God placed Esther in a position of influence for a purpose.' },
      { ref:'Esther 4:14',     title:'For such a time as this',     focus:'Mordecai\'s challenge — your position is your calling.' },
      { ref:'Esther 4:16',     title:'If I perish, I perish',       focus:'Esther chose courage over self-preservation.' },
      { ref:'Esther 5:2',      title:'The king extended the sceptre',focus:'God went before Esther and prepared the way.' },
      { ref:'Esther 8:17',     title:'Many people became Jews',     focus:'One act of courageous obedience had mass impact.' },
    ],
  },
  {
    id:'ruth', name:'Ruth', icon:'🌾', color:'#4A7C5F',
    description:'Loyalty, sacrifice, and unexpected redemption',
    passages:[
      { ref:'Ruth 1:16-17',   title:'Where you go I will go',       focus:'Ruth\'s extraordinary commitment to Naomi and to God.' },
      { ref:'Ruth 2:12',      title:'May you be richly rewarded',   focus:'Boaz recognised and honoured Ruth\'s faithfulness.' },
      { ref:'Ruth 3:9',       title:'Spread your wings over me',    focus:'Ruth\'s humble request for Boaz to be her kinsman-redeemer.' },
      { ref:'Ruth 4:13-14',   title:'He became a redeemer',         focus:'The story ends in restoration and blessing.' },
    ],
  },
]

// ─────────────────────────────────────────────
//  TEMPLATES — inspiration-only, no content
// ─────────────────────────────────────────────
export const PLAN_TEMPLATES = [
  { id:'couples',       icon:'💑', color:'#E84060', durationDays:14, name:'Couples Devotional Challenge',   description:'For couples growing in God\'s Word together'                },
  { id:'friends',       icon:'👥', color:'#5B4FCF', durationDays:21, name:'Friends Who Love the Bible',      description:'For a friend group building a shared reading habit'         },
  { id:'fellowship',    icon:'⛪', color:'#4A7C5F', durationDays:30, name:'Fellowship Bible Reading Plan',   description:'For a small group or home church reading together'          },
  { id:'church',        icon:'🙌', color:'#5B4FCF', durationDays:30, name:'Church Bible Reading Plan',       description:'For a whole church congregation reading in sync'            },
  { id:'100day',        icon:'🏆', color:'#E8A838', durationDays:100,name:'100-Day Bible Challenge',         description:'A landmark journey through the whole story of Scripture'    },
  { id:'50day',         icon:'🌱', color:'#4A7C5F', durationDays:50, name:'50-Day Journey',                  description:'A focused mid-length plan for any season of life'           },
  { id:'campus',        icon:'🎓', color:'#7CB9E8', durationDays:21, name:'Campus Bible Challenge',          description:'For students and campus fellowships'                        },
  { id:'accountability',icon:'🤝', color:'#5B4FCF', durationDays:14, name:'Accountability Partner Plan',     description:'For two people keeping each other in the Word'             },
  { id:'new_believer',  icon:'🌿', color:'#4A7C5F', durationDays:21, name:'New Believer\'s Reading Plan',    description:'For someone who just started their faith journey'           },
  { id:'family',        icon:'🏠', color:'#E8A838', durationDays:30, name:'Family Devotional Plan',          description:'For families reading and discussing together'               },
  { id:'solo',          icon:'📖', color:'#5B4FCF', durationDays:14, name:'Personal Study Plan',             description:'Just you and God — focused daily reading'                   },
]

export function generateInviteCode(planName) {
  const prefix = (planName||'PLN').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,3).padEnd(3,'X')
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'0')
  return `${prefix}-${suffix}`
}