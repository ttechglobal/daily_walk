// ─────────────────────────────────────────────────────────────
//  lib/topical-plans.js — 3 hardcoded 30-day topical plans
// ─────────────────────────────────────────────────────────────

export const TOPICAL_PLANS = [
  {
    id: 'new-believer',
    name: 'New Life',
    description: 'Perfect for those who have just given their life to Christ. 30 days of foundational truths about salvation, identity, and walking with God.',
    theme: 'Salvation & Identity',
    color: '#4A7C5F',
    icon: 'Sparkles',
    duration: 30,
    days: [
      { day:1,  passage:'John 3:16-17',         title:'God so loved the world',       focus:"The foundation of everything — God's love and the gift of salvation." },
      { day:2,  passage:'Romans 10:9-10',        title:'Confess and believe',          focus:'What it means to truly give your life to Christ.' },
      { day:3,  passage:'2 Corinthians 5:17',    title:'You are a new creation',       focus:'Your old self is gone. Everything is new in Christ.' },
      { day:4,  passage:'Ephesians 2:8-9',       title:'Saved by grace',               focus:'Salvation is a gift — not earned, not deserved.' },
      { day:5,  passage:'Romans 8:1',            title:'No condemnation',              focus:'There is no guilt or shame for those in Christ Jesus.' },
      { day:6,  passage:'John 1:12',             title:'Child of God',                 focus:"You have been given the right to be called God's child." },
      { day:7,  passage:'Romans 8:38-39',        title:'Nothing can separate us',      focus:"God's love for you is permanent and unshakeable." },
      { day:8,  passage:'Psalm 103:12',          title:'Sins removed forever',         focus:'Your past sins are removed as far as east is from west.' },
      { day:9,  passage:'Galatians 2:20',        title:'Christ lives in me',           focus:'You are now indwelled by Christ himself.' },
      { day:10, passage:'Romans 5:1',            title:'Peace with God',               focus:'Through faith you now have full peace with your Creator.' },
      { day:11, passage:'1 John 3:1',            title:'Called children of God',       focus:'Marvel at what the Father has lavished on you.' },
      { day:12, passage:'Ephesians 1:7',         title:'Redeemed and forgiven',        focus:'In Christ you have redemption through his blood.' },
      { day:13, passage:'John 10:10',            title:'Life in abundance',            focus:'Jesus came so you could have life to the full.' },
      { day:14, passage:'Philippians 4:7',       title:'Peace beyond understanding',   focus:"God's peace guards your heart and mind in Christ." },
      { day:15, passage:'Isaiah 43:1',           title:'I have called you by name',    focus:'You are known, named, and claimed by God himself.' },
      { day:16, passage:'Jeremiah 29:11',        title:'Plans to give you hope',       focus:'God has a specific, good plan designed for your life.' },
      { day:17, passage:'Romans 12:2',           title:'Renew your mind',              focus:'Transformation begins with how you think.' },
      { day:18, passage:'1 Peter 2:9',           title:'A chosen people',              focus:'You are chosen, royal, holy, and belonging to God.' },
      { day:19, passage:'Hebrews 4:16',          title:'Come boldly to God',           focus:'You can approach God with full confidence and freedom.' },
      { day:20, passage:'James 4:8',             title:'Draw near to God',             focus:'When you come close to God, he comes close to you.' },
      { day:21, passage:'Matthew 6:33',          title:"Seek first his kingdom",       focus:'Put God first and everything else falls into place.' },
      { day:22, passage:'Psalm 119:105',         title:'A lamp to your path',          focus:"God's word is your daily guide for every decision." },
      { day:23, passage:'John 15:5',             title:'Abide in the vine',            focus:'Fruitfulness comes from staying connected to Christ.' },
      { day:24, passage:'1 Thessalonians 5:17',  title:'Pray without ceasing',         focus:'Prayer is your constant conversation with God.' },
      { day:25, passage:'Hebrews 10:25',         title:'Do not give up meeting',       focus:'Community and fellowship are vital to your growth.' },
      { day:26, passage:'Galatians 5:22-23',     title:'Fruit of the Spirit',          focus:'These qualities grow in you as you walk with God.' },
      { day:27, passage:'Romans 8:26',           title:'The Spirit helps us',          focus:"When you don't know how to pray, the Spirit intercedes." },
      { day:28, passage:'Matthew 28:19-20',      title:'Go and make disciples',        focus:'Your faith is meant to be shared with others.' },
      { day:29, passage:'Revelation 3:20',       title:'I stand at the door',          focus:'Jesus knocks — he wants daily access to your life.' },
      { day:30, passage:'Philippians 1:6',       title:'He will complete the work',    focus:'God who started this work in you will finish it.' },
    ],
  },
  {
    id: 'faith',
    name: 'Walking by Faith',
    description: 'Thirty days of Scripture on trusting God in every season — when life is clear and when it is not.',
    theme: 'Faith & Trust',
    color: '#5B4FCF',
    icon: 'Mountain',
    duration: 30,
    days: [
      { day:1,  passage:'Hebrews 11:1',          title:'What faith is',                focus:'Faith is being sure of what we hope for, certain of what we do not see.' },
      { day:2,  passage:'Romans 10:17',          title:'Faith comes by hearing',       focus:"Faith is built through consistent exposure to God's word." },
      { day:3,  passage:'Matthew 17:20',         title:'Faith like a mustard seed',    focus:'Even the smallest faith can move what seems immovable.' },
      { day:4,  passage:'Proverbs 3:5-6',        title:'Trust with all your heart',    focus:"Lean on God's understanding, not your own." },
      { day:5,  passage:'2 Corinthians 5:7',     title:'Walk by faith not sight',      focus:'Living by faith means acting before you can see the outcome.' },
      { day:6,  passage:'Isaiah 40:31',          title:'Renew your strength',          focus:'Those who wait on the Lord will soar like eagles.' },
      { day:7,  passage:'Psalm 46:1-2',          title:'God is our refuge',            focus:'Even when everything shakes, God is a firm foundation.' },
      { day:8,  passage:'Mark 11:24',            title:'Believe you have received',    focus:'Pray with the expectation that God has already answered.' },
      { day:9,  passage:'Hebrews 11:6',          title:'Without faith impossible',     focus:'Those who come to God must believe that he rewards seekers.' },
      { day:10, passage:'Romans 4:20-21',        title:"Abraham's faith",              focus:'He did not waver — he was fully persuaded God would act.' },
      { day:11, passage:'James 1:3',             title:'Testing grows faith',          focus:'Trials are the training ground where faith becomes strong.' },
      { day:12, passage:'Matthew 14:28-31',      title:'Peter walks on water',         focus:'Faith steps out. Doubt sinks. Keep your eyes on Jesus.' },
      { day:13, passage:'Psalm 37:3-4',          title:'Trust and delight',            focus:'Delight in God and he will give you the desires of your heart.' },
      { day:14, passage:'Numbers 23:19',         title:'God does not lie',             focus:'Every promise God has spoken, he will fulfil.' },
      { day:15, passage:'Lamentations 3:22-23',  title:'Mercies new every morning',    focus:"God's faithfulness is the ground on which your faith stands." },
      { day:16, passage:'John 11:40',            title:'See the glory of God',         focus:'If you believe, you will see God move beyond expectation.' },
      { day:17, passage:'Philippians 4:6-7',     title:'Do not be anxious',            focus:'Replace anxiety with prayer and receive supernatural peace.' },
      { day:18, passage:'Joshua 1:9',            title:'Strong and courageous',        focus:'Courage is not the absence of fear — it is faith in action.' },
      { day:19, passage:'Habakkuk 2:3',          title:'The vision awaits',            focus:'Though it seems slow, wait for it — it will certainly come.' },
      { day:20, passage:'Mark 9:23',             title:'All things are possible',      focus:'Everything is possible for the one who believes.' },
      { day:21, passage:'Psalm 56:3',            title:'When I am afraid',             focus:'Fear and faith can coexist — choose faith in the moment.' },
      { day:22, passage:'Romans 8:28',           title:'All things work together',     focus:'God is weaving every hard thing into something good.' },
      { day:23, passage:'Ephesians 6:16',        title:'Shield of faith',              focus:'Faith is your defence against every attack of the enemy.' },
      { day:24, passage:'1 John 5:4',            title:'Faith overcomes the world',    focus:'The victory that overcomes the world is our faith.' },
      { day:25, passage:'Isaiah 26:3',           title:'Perfect peace',                focus:'A mind fixed on God is kept in perfect, complete peace.' },
      { day:26, passage:'Luke 1:45',             title:'Blessed is she who believed',  focus:"Believing God's word before seeing results is true faith." },
      { day:27, passage:'Psalm 27:13-14',        title:'Wait for the Lord',            focus:'Waiting is not passive — it is active, expectant trust.' },
      { day:28, passage:'Daniel 3:17-18',        title:'Even if he does not',          focus:'The highest faith trusts God regardless of the outcome.' },
      { day:29, passage:'Hebrews 12:2',          title:'Fix your eyes on Jesus',       focus:'Jesus is both the author and the finisher of your faith.' },
      { day:30, passage:'Revelation 2:10',       title:'Be faithful unto the end',     focus:'Hold on. A crown of life awaits those who remain faithful.' },
    ],
  },
  {
    id: 'anxiety-and-fear',
    name: 'Perfect Peace',
    description: "Thirty days of Scripture specifically for seasons of anxiety, fear, and uncertainty. Let God's word replace worry with peace.",
    theme: 'Peace & Courage',
    color: '#7CB9E8',
    icon: 'Wind',
    duration: 30,
    days: [
      { day:1,  passage:'Philippians 4:6-7',    title:'Do not be anxious',            focus:"God's peace, beyond all understanding, will guard your heart." },
      { day:2,  passage:'Isaiah 41:10',         title:'Do not fear',                  focus:'God promises to strengthen, help, and uphold you.' },
      { day:3,  passage:'John 14:27',           title:'Peace I leave with you',       focus:'The peace Jesus gives is unlike anything the world offers.' },
      { day:4,  passage:'Psalm 23:4',           title:'Through the valley',           focus:'Even in your darkest season, God is walking beside you.' },
      { day:5,  passage:'1 Peter 5:7',          title:'Cast your anxiety on him',     focus:'God does not just tolerate your worry — he invites you to give it to him.' },
      { day:6,  passage:'Matthew 6:34',         title:'Do not worry about tomorrow',  focus:'Anxiety lives in the future. God meets you in the present.' },
      { day:7,  passage:'Psalm 46:10',          title:'Be still and know',            focus:'Sometimes the most faithful act is to stop striving and rest.' },
      { day:8,  passage:'Romans 8:15',          title:'Spirit of adoption',           focus:'You did not receive a spirit of fear but of sonship and love.' },
      { day:9,  passage:'2 Timothy 1:7',        title:'Power love sound mind',        focus:'Fear is not from God. Power, love, and clarity are.' },
      { day:10, passage:'Isaiah 26:3',          title:'Perfect peace',                focus:'Fix your mind on God and he keeps you in perfect peace.' },
      { day:11, passage:'Psalm 34:4',           title:'He delivered me',              focus:'Seek God honestly and he will free you from your fears.' },
      { day:12, passage:'Matthew 11:28-30',     title:'Come to me',                   focus:'Jesus personally invites the burdened and anxious to rest.' },
      { day:13, passage:'Hebrews 13:6',         title:'The Lord is my helper',        focus:'With God on your side, what can any person do to you?' },
      { day:14, passage:'Psalm 91:1-2',         title:'Dwelling in shelter',          focus:'Living close to God is the safest place you will ever be.' },
      { day:15, passage:'Numbers 6:24-26',      title:'The Lord bless and keep',      focus:"God's face is turned toward you — shining on you with grace." },
      { day:16, passage:'Romans 5:3-4',         title:'Suffering produces hope',      focus:'Hard seasons are producing something lasting in you.' },
      { day:17, passage:'Joshua 1:9',           title:'Strong and courageous',        focus:'God commands courage because he knows he is always with you.' },
      { day:18, passage:'Psalm 55:22',          title:'Cast your burden',             focus:'God will sustain you — he will never let the righteous fall.' },
      { day:19, passage:'Luke 12:25',           title:'Worry adds nothing',           focus:'Anxiety cannot change a single outcome. Prayer can.' },
      { day:20, passage:'Zephaniah 3:17',       title:'God rejoices over you',        focus:'God is not disappointed in you — he is singing over you.' },
      { day:21, passage:'Psalm 62:5-6',         title:'My soul find rest',            focus:'Rest your hope fully and only in God. He will not move.' },
      { day:22, passage:'Isaiah 43:2',          title:'When you pass through',        focus:'God does not promise no floods — he promises to be in them with you.' },
      { day:23, passage:'John 16:33',           title:'Take heart',                   focus:'Jesus has already overcome everything you are facing.' },
      { day:24, passage:'Psalm 121:1-2',        title:'Where does help come from',    focus:'Lift your eyes. Your help comes from the Lord who made everything.' },
      { day:25, passage:'Proverbs 12:25',       title:'Anxiety weighs down',          focus:"A kind word — from God's word — lifts a heavy heart." },
      { day:26, passage:'Romans 8:38-39',       title:'Nothing can separate us',      focus:'Not anxiety, not failure, not fear — nothing separates you from his love.' },
      { day:27, passage:'Psalm 16:8',           title:'He is at my right hand',       focus:'With God this close, you will not be shaken.' },
      { day:28, passage:'Nahum 1:7',            title:'Good in times of trouble',     focus:'God is a refuge. He knows those who take shelter in him.' },
      { day:29, passage:'Colossians 3:15',      title:'Let peace rule',               focus:'Let God\'s peace be the umpire of every decision you make.' },
      { day:30, passage:'Revelation 21:4',      title:'No more tears',                focus:'Every fear you have now will be wiped away by his hand.' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
//  getTopicalPlans — Supabase first, fallback to hardcoded
// ─────────────────────────────────────────────────────────────
export async function getTopicalPlans() {
  try {
    const { createClient } = await import('./supabase/client')
    const sb = createClient()
    if (sb) {
      const { data, error } = await sb
        .from('topical_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (!error && data && data.length > 0) return data
    }
  } catch {}
  return TOPICAL_PLANS
}

// SQL for topical_plans table — run in Supabase SQL editor:
// create table public.topical_plans (
//   id text primary key,
//   name text not null,
//   description text,
//   theme text,
//   color text default '#5B4FCF',
//   icon text default 'BookOpen',
//   duration integer not null,
//   days jsonb not null default '[]',
//   is_active boolean default true,
//   created_at timestamptz default now()
// );
// alter table public.topical_plans enable row level security;
// create policy "Plans visible to everyone" on public.topical_plans for select using (is_active = true);