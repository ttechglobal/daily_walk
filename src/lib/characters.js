// ─────────────────────────────────────────────────────────────
//  lib/characters.js — Bible Character Companion data
//
//  CHARACTER IMAGE SETUP:
//  1. Generate images using the AI prompt at the bottom of this file
//  2. Place PNG files in /public/characters/ with these exact names:
//       david-radiant.png, david-happy.png, david-neutral.png,
//       david-quiet.png, david-sad.png, david-struggling.png
//     (same pattern for daniel, esther, mary)
//  3. Change the IMAGE_MODE below from 'placeholder' to 'real'
//  4. That's it — no other code changes needed
//
//  IMAGE_MODE options:
//    'placeholder' → shows styled SVG card with emoji (current)
//    'real'        → uses PNG files from /public/characters/
// ─────────────────────────────────────────────────────────────

export const IMAGE_MODE = 'real' // ← change to 'real' when images are ready

function img(characterId, state) {
  if (IMAGE_MODE !== 'real') return null
  return `/characters/${characterId}-${state}.svg`
}

export const CHARACTERS = [
  {
    id: 'david',
    name: 'David',
    title: 'The Worshipper',
    description: "A man after God's own heart",
    signatureVerse: 'Your word is a lamp to my feet and a light to my path.',
    signatureRef: 'Psalm 119:105',
    accentColor: '#E8A838',
    images: {
      radiant:    img('david', 'radiant'),
      happy:      img('david', 'happy'),
      neutral:    img('david', 'neutral'),
      quiet:      img('david', 'quiet'),
      sad:        img('david', 'sad'),
      struggling: img('david', 'struggling'),
      fading:     img('david', 'fading'),
    },
    lines: {
      radiant:    'The law of your mouth is better to me than thousands of gold and silver pieces.',
      happy:      'I delight in your law; I meditate on it day and night.',
      neutral:    'My soul thirsts for God, for the living God.',
      quiet:      'How long, Lord? Will you forget me forever?',
      sad:        'My tears have been my food day and night.',
      struggling: 'I am worn out from my groaning. Restore me, Lord.',
      fading:     'My strength is dried up. Do not be far from me, Lord.',
    },
    messages: {
      celebrating:  "Your word is sweeter than honey! You showed up today — well done! 🎉",
      welcoming:    "The LORD is my strength and my song. Ready to read today?",
      gentle_nudge: "As the deer pants for water, my soul pants for God. Come back today.",
      missing_you:  "I cry out to you, Lord. Open your Word — even one verse is enough.",
      concerned:    "Why are you downcast, O my soul? Return to God. He is waiting.",
      waiting:      "Out of the depths I cry to you, Lord. One tap is all it takes to return.",
    },
    placeholderEmoji: '👑',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    title: 'The Disciplined',
    description: 'Faithful in every season',
    signatureVerse: 'Three times a day he got down on his knees and prayed.',
    signatureRef: 'Daniel 6:10',
    accentColor: '#5B4FCF',
    images: {
      radiant:    img('daniel', 'radiant'),
      happy:      img('daniel', 'happy'),
      neutral:    img('daniel', 'neutral'),
      quiet:      img('daniel', 'quiet'),
      sad:        img('daniel', 'sad'),
      struggling: img('daniel', 'struggling'),
      fading:     img('daniel', 'fading'),
    },
    lines: {
      radiant:    'I sought the Lord and he answered me; he delivered me from all my fears.',
      happy:      'The people who know their God shall stand firm and take action.',
      neutral:    'I turned to the Lord God, pleading with him in prayer.',
      quiet:      'We do not make requests because we are righteous, but because of your mercy.',
      sad:        'I have been left alone, and my strength has turned to weakness.',
      struggling: 'I mourned for three weeks. I ate no choice food.',
      fading:     'I had no strength left. I fell into a deep sleep, face to the ground.',
    },
    messages: {
      celebrating:  "You prayed, you read, you stood firm. The Lord is with you today! 🙏",
      welcoming:    "Three times a day I seek the Lord. Will you seek him with me today?",
      gentle_nudge: "Do not give up your post. Return to prayer and the Word today.",
      missing_you:  "The God we serve is able. Come back to him — open your Bible.",
      concerned:    "I set my face toward the Lord and sought him. Come, seek him again.",
      waiting:      "Even in the lion's den, I kept seeking God. Come back — he never left.",
    },
    placeholderEmoji: '🦁',
  },
  {
    id: 'esther',
    name: 'Esther',
    title: 'The Courageous',
    description: 'Born for such a time as this',
    signatureVerse: 'Go, gather together all the Jews and fast for me.',
    signatureRef: 'Esther 4:16',
    accentColor: '#C77DFF',
    images: {
      radiant:    img('esther', 'radiant'),
      happy:      img('esther', 'happy'),
      neutral:    img('esther', 'neutral'),
      quiet:      img('esther', 'quiet'),
      sad:        img('esther', 'sad'),
      struggling: img('esther', 'struggling'),
      fading:     img('esther', 'fading'),
    },
    lines: {
      radiant:    'For such a time as this, I will go before the king.',
      happy:      'I will do as you ask. I will fast, and then I will act.',
      neutral:    'Fast for me. Do not eat or drink for three days.',
      quiet:      'If I perish, I perish. But I must seek the Lord first.',
      sad:        'I am not yet prepared. I have not yet sought him enough.',
      struggling: 'I am afraid. The sceptre has not been extended to me.',
      fading:     'I have hidden myself. I have forgotten my purpose.',
    },
    messages: {
      celebrating:  "You showed up for such a time as this. God sees your faithfulness! ✨",
      welcoming:    "Such a time as this — this moment is your moment to seek God.",
      gentle_nudge: "Fast, pray, seek. Even one step back toward God changes everything.",
      missing_you:  "Do not think that you are far from God's reach. Return today.",
      concerned:    "If I perish, I perish — but I will seek the Lord. Come back with me.",
      waiting:      "God positioned you for this moment. He is still here. Come back.",
    },
    placeholderEmoji: '👸',
  },
  {
    id: 'mary',
    name: 'Mary',
    title: 'The Listener',
    description: 'She chose the better thing',
    signatureVerse: "Mary sat at the Lord's feet, listening to what he said.",
    signatureRef: 'Luke 10:39',
    accentColor: '#4A7C5F',
    images: {
      radiant:    img('mary', 'radiant'),
      happy:      img('mary', 'happy'),
      neutral:    img('mary', 'neutral'),
      quiet:      img('mary', 'quiet'),
      sad:        img('mary', 'sad'),
      struggling: img('mary', 'struggling'),
      fading:     img('mary', 'fading'),
    },
    lines: {
      radiant:    'I have chosen the better thing, and it will not be taken from me.',
      happy:      'I sit at his feet and listen. This is where I belong.',
      neutral:    'My soul magnifies the Lord. I will return to him.',
      quiet:      'I am stepping away from the noise to find him again.',
      sad:        'I have been distracted by many things. I miss his presence.',
      struggling: "I have wandered far from his feet. I can barely hear his voice.",
      fading:     'I have forgotten how to be still. I am lost in the crowd.',
    },
    messages: {
      celebrating:  "You chose the better thing today. Sit at his feet and be filled! 🕊️",
      welcoming:    "Come, sit at his feet. Everything else can wait. He is speaking.",
      gentle_nudge: "Martha was distracted too. Come back and choose the better thing.",
      missing_you:  "He is still speaking. Come back to his feet — he has not moved.",
      concerned:    "The one thing needed is still here, waiting for you. Come and listen.",
      waiting:      "He is knocking. He has been waiting. One moment at his feet changes all.",
    },
    placeholderEmoji: '🕊️',
  },
]

export function getCharacterById(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]
}

// ─────────────────────────────────────────────────────────────
//  AI IMAGE GENERATION PROMPT
//  Copy this prompt into Midjourney, DALL-E, or Ideogram.
//  Generate all 6 states per character in one session.
//
//  PROMPT TEMPLATE (replace [CHARACTER] and [STATE]):
//
//  "Digital illustration of [CHARACTER] from the Bible, [STATE] expression,
//   upper body portrait, warm painterly style, soft lighting,
//   transparent background, 400x400px, suitable for a mobile app.
//   Style: modern but timeless, ethnically diverse, inviting warmth."
//
//  STATES per character:
//  radiant    → glowing, joyful, arms slightly raised
//  happy      → warm smile, peaceful eyes, relaxed posture
//  neutral    → calm, attentive, slight forward lean
//  quiet      → thoughtful, eyes slightly downcast, gentle
//  sad        → downcast eyes, slight droop, still dignified
//  struggling → heavy expression, tired eyes, still present
//
//  CHARACTERS:
//  David   → young man, shepherd/king attire, amber/gold tones
//  Daniel  → wise young man, dignified bearing, purple/navy tones
//  Esther  → young woman, royal but humble, violet/gold tones
//  Mary    → gentle woman, simple clothing, sage green/earth tones
//
//  IMPORTANT:
//  - Generate all 6 states in one session per character (consistent look)
//  - 400×400px PNG with transparent background
//  - Save as: [name]-[state].png (e.g. david-radiant.png)
//  - Place in /public/characters/
//  - Change IMAGE_MODE at top of this file to 'real'
// ─────────────────────────────────────────────────────────────