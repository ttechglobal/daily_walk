// ── lib/characters.js ──
// Character data for all 4 Bible companions.
//
// IMAGE PATHS (auto-resolved — no code changes needed):
//   /public/characters/{id}/{id}-{state}.svg
//   e.g. /public/characters/david/david-radiant.svg
//
// To use real character images:
//   1. Export SVG files from your design tool
//   2. Place them at the paths above (replacing the placeholders)
//   3. Done — the app uses them automatically
//
// States: radiant | happy | neutral | quiet | sad | struggling

export const CHARACTERS = [
  {
    id: 'david',
    name: 'David',
    title: 'The Worshipper',
    description: "A man after God's own heart",
    signatureVerse: 'Your word is a lamp to my feet and a light to my path.',
    signatureRef: 'Psalm 119:105',
    accentColor: '#E8A838',
    placeholderEmoji: '👑',
    messages: {
      // New image-state messages (6 states)
      radiant:     "The law of your mouth is better to me than thousands of gold pieces.",
      happy:       "I delight in your law; I meditate on it day and night.",
      neutral:     "Your word is a lamp to my feet and a light to my path.",
      quiet:       "My soul thirsts for God. When can I come and meet with him?",
      sad:         "How long, Lord? Will you forget me? Light my eyes again.",
      struggling:  "Out of the depths I cry to you, Lord. Restore me — I'm coming back.",
      // Legacy mood messages (for CharacterCompanion mood system)
      celebrating:  "Your word is sweeter than honey! You showed up today — well done! 🎉",
      welcoming:    "The LORD is my strength and my song. Ready to read today?",
      gentle_nudge: "As the deer pants for water, my soul pants for God. Come back today.",
      missing_you:  "I cry out to you, Lord. Open your Word — even one verse is enough.",
      concerned:    "Why are you downcast, O my soul? Return to God. He is waiting.",
      waiting:      "Out of the depths I cry to you, Lord. One tap is all it takes to return.",
    },
  },
  {
    id: 'daniel',
    name: 'Daniel',
    title: 'The Disciplined',
    description: 'Faithful in every season',
    signatureVerse: 'Three times a day he got down on his knees and prayed.',
    signatureRef: 'Daniel 6:10',
    accentColor: '#5B4FCF',
    placeholderEmoji: '🦁',
    messages: {
      radiant:     "The people who know their God shall stand firm and take action.",
      happy:       "Three times a day I kneel and pray, giving thanks to my God.",
      neutral:     "I turned to the Lord and sought him with prayer and fasting.",
      quiet:       "Set your face toward the Lord. He hears from the first day.",
      sad:         "I mourned and fasted — but God sent his answer. Come back.",
      struggling:  "Even in the lions' den, God shut every mouth. He is still able.",
      celebrating:  "You prayed, you read, you stood firm. The Lord is with you today! 🙏",
      welcoming:    "Three times a day I seek the Lord. Will you seek him with me today?",
      gentle_nudge: "Do not give up your post. Return to prayer and the Word today.",
      missing_you:  "The God we serve is able. Come back to him — open your Bible.",
      concerned:    "I set my face toward the Lord and sought him. Come, seek him again.",
      waiting:      "Even in the lion's den, I kept seeking God. Come back — he never left.",
    },
  },
  {
    id: 'esther',
    name: 'Esther',
    title: 'The Courageous',
    description: 'Born for such a time as this',
    signatureVerse: 'Go, gather together all the Jews and fast for me.',
    signatureRef: 'Esther 4:16',
    accentColor: '#C77DFF',
    placeholderEmoji: '👸',
    messages: {
      radiant:     "For such a time as this — you are exactly where you are meant to be.",
      happy:       "I will go, and if I perish — but first I will seek the Lord.",
      neutral:     "Fast for me. Seek him. Then act with courage.",
      quiet:       "Do not think you are far from his reach. He sees you.",
      sad:         "Even queens need preparation. Come back to his presence.",
      struggling:  "You were made for this moment. Come back — he is waiting.",
      celebrating:  "You showed up for such a time as this. God sees your faithfulness! ✨",
      welcoming:    "Such a time as this — this moment is your moment to seek God.",
      gentle_nudge: "Fast, pray, seek. Even one step back toward God changes everything.",
      missing_you:  "Do not think that you are far from God's reach. Return today.",
      concerned:    "If I perish, I perish — but I will seek the Lord. Come back with me.",
      waiting:      "God positioned you for this moment. He is still here. Come back.",
    },
  },
  {
    id: 'mary',
    name: 'Mary',
    title: 'The Listener',
    description: 'She chose the better thing',
    signatureVerse: "Mary sat at the Lord's feet, listening to what he said.",
    signatureRef: 'Luke 10:39',
    accentColor: '#4A7C5F',
    placeholderEmoji: '🕊️',
    messages: {
      radiant:     "I have chosen the better thing, and it will not be taken from me.",
      happy:       "I sit at his feet and listen. This is where I belong.",
      neutral:     "Come, leave the busyness. His voice is still speaking.",
      quiet:       "Martha was distracted too. Come choose the better thing again.",
      sad:         "He is still here, still speaking. Come back to his feet.",
      struggling:  "One moment at his feet changes everything. Come back today.",
      celebrating:  "You chose the better thing today. Sit at his feet and be filled! 🕊️",
      welcoming:    "Come, sit at his feet. Everything else can wait. He is speaking.",
      gentle_nudge: "Martha was distracted too. Come back and choose the better thing.",
      missing_you:  "He is still speaking. Come back to his feet — he has not moved.",
      concerned:    "The one thing needed is still here, waiting for you. Come and listen.",
      waiting:      "He is knocking. He has been waiting. One moment at his feet changes all.",
    },
  },
]

export function getCharacterById(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]
}