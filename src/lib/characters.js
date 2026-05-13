// ─────────────────────────────────────────────────────────────
//  lib/characters.js — Bible Character Companion data
//
//  IMAGE SWAP INSTRUCTIONS:
//  Replace null values with actual image paths when ready.
//  e.g. images: { radiant: '/characters/david-radiant.png' }
//  Images should be 300×300px PNG with transparent background.
//  Placeholders render styled SVG cards until real images are set.
// ─────────────────────────────────────────────────────────────

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
      radiant: null, happy: null, neutral: null,
      quiet: null, sad: null, struggling: null, fading: null,
    },
    // lines[] — shown based on character visual state (for Bible verse flavour)
    lines: {
      radiant:    'The law of your mouth is better to me than thousands of gold and silver pieces.',
      happy:      'I delight in your law; I meditate on it day and night.',
      neutral:    'My soul thirsts for God, for the living God.',
      quiet:      'How long, Lord? Will you forget me forever?',
      sad:        'My tears have been my food day and night.',
      struggling: 'I am worn out from my groaning. Restore me, Lord.',
      fading:     'My strength is dried up. Do not be far from me, Lord.',
    },
    // messages[] — encouragement shown in tooltip on tap (based on mood)
    messages: {
      celebrating:  "Your word is sweeter than honey! You showed up today — well done!",
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
      radiant: null, happy: null, neutral: null,
      quiet: null, sad: null, struggling: null, fading: null,
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
      celebrating:  "You prayed, you read, you stood firm. The Lord is with you today!",
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
      radiant: null, happy: null, neutral: null,
      quiet: null, sad: null, struggling: null, fading: null,
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
      celebrating:  "You showed up for such a time as this. God sees your faithfulness!",
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
      radiant: null, happy: null, neutral: null,
      quiet: null, sad: null, struggling: null, fading: null,
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
      celebrating:  "You chose the better thing today. Sit at his feet and be filled!",
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