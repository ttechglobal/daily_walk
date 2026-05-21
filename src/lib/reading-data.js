// ── src/lib/reading-data.js ──
// Complete data for the three reading modes: Book, Topic, Character.
// Used by the plan creation flow to generate day-by-day schedules.

// ─────────────────────────────────────────────
//  BIBLE BOOKS — full OT + NT with chapter counts
// ─────────────────────────────────────────────
export const BIBLE_BOOKS_FULL = [
  // Old Testament
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
  // New Testament
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
//  TOPICS — curated passage lists
// ─────────────────────────────────────────────
export const TOPICS = [
  {
    id: 'faith',
    name: 'Faith',
    icon: '🙏',
    color: '#5B4FCF',
    description: 'Trusting God through every season',
    passages: [
      { ref:'Hebrews 11:1',       title:'What faith is'              },
      { ref:'Romans 10:17',       title:'Faith comes by hearing'     },
      { ref:'Matthew 17:20',      title:'Faith like a mustard seed'  },
      { ref:'Proverbs 3:5-6',     title:'Trust with all your heart'  },
      { ref:'2 Corinthians 5:7',  title:'Walk by faith not sight'    },
      { ref:'Isaiah 40:31',       title:'Renew your strength'        },
      { ref:'Psalm 46:1-2',       title:'God is our refuge'          },
      { ref:'Mark 11:24',         title:'Believe you have received'  },
      { ref:'Hebrews 11:6',       title:'Without faith impossible'   },
      { ref:'Romans 4:20-21',     title:"Abraham's faith"            },
      { ref:'James 1:3',          title:'Testing grows faith'        },
      { ref:'Matthew 14:28-31',   title:'Peter walks on water'       },
      { ref:'Psalm 37:3-4',       title:'Trust and delight'          },
      { ref:'Lamentations 3:22-23', title:'Mercies new every morning' },
    ],
  },
  {
    id: 'prayer',
    name: 'Prayer',
    icon: '✝️',
    color: '#4A7C5F',
    description: 'Learning to talk with God',
    passages: [
      { ref:'Matthew 6:9-13',     title:"The Lord's Prayer"         },
      { ref:'Philippians 4:6-7',  title:'Pray about everything'     },
      { ref:'1 Thessalonians 5:17', title:'Pray without ceasing'    },
      { ref:'James 5:16',         title:'Prayer of a righteous man' },
      { ref:'Psalm 5:1-3',        title:'Morning prayer'            },
      { ref:'Luke 11:1-4',        title:'Teach us to pray'          },
      { ref:'Romans 8:26',        title:'The Spirit helps us pray'  },
      { ref:'John 17:1-5',        title:'Jesus prays for glory'     },
      { ref:'Psalm 141:2',        title:'Prayer as incense'         },
      { ref:'Hebrews 4:16',       title:'Come boldly to God'        },
      { ref:'Matthew 7:7-8',      title:'Ask, seek, knock'          },
      { ref:'1 John 5:14-15',     title:'Confidence in prayer'      },
      { ref:'Daniel 6:10',        title:'Daniel prays daily'        },
      { ref:'Nehemiah 1:4-11',    title:'Nehemiah\'s prayer'        },
    ],
  },
  {
    id: 'forgiveness',
    name: 'Forgiveness',
    icon: '🕊️',
    color: '#7CB9E8',
    description: 'Receiving and extending grace',
    passages: [
      { ref:'1 John 1:9',         title:'Confess and be forgiven'    },
      { ref:'Psalm 103:12',       title:'Sins removed forever'       },
      { ref:'Ephesians 4:32',     title:'Forgive as God forgave you' },
      { ref:'Matthew 6:14-15',    title:'If you forgive others'      },
      { ref:'Colossians 3:13',    title:'Bear with one another'      },
      { ref:'Luke 15:11-24',      title:'The prodigal son'           },
      { ref:'Romans 8:1',         title:'No condemnation'            },
      { ref:'Isaiah 43:25',       title:'I remember your sins no more'},
      { ref:'Matthew 18:21-22',   title:'Forgive seventy times seven'},
      { ref:'Micah 7:18-19',      title:'He delights in mercy'       },
      { ref:'Acts 13:38',         title:'Forgiveness of sins'        },
      { ref:'Hebrews 10:17',      title:'Sins remembered no more'    },
      { ref:'Luke 23:34',         title:'Father forgive them'        },
      { ref:'Psalm 51:1-4',       title:'Create in me a clean heart' },
    ],
  },
  {
    id: 'identity',
    name: 'Identity',
    icon: '👑',
    color: '#E8A838',
    description: 'Who you are in Christ',
    passages: [
      { ref:'Genesis 1:27',       title:'Made in God\'s image'      },
      { ref:'John 1:12',          title:'Child of God'              },
      { ref:'2 Corinthians 5:17', title:'New creation'              },
      { ref:'Ephesians 2:10',     title:'God\'s masterpiece'        },
      { ref:'1 Peter 2:9',        title:'Chosen, royal, holy'       },
      { ref:'Romans 8:17',        title:'Heirs with Christ'         },
      { ref:'Galatians 2:20',     title:'Christ lives in me'        },
      { ref:'Psalm 139:13-14',    title:'Fearfully and wonderfully made'},
      { ref:'Jeremiah 1:5',       title:'Known before you were born' },
      { ref:'Isaiah 43:1',        title:'I have called you by name'  },
      { ref:'Ephesians 1:4',      title:'Chosen before creation'     },
      { ref:'John 15:15',         title:'Called friends'             },
      { ref:'1 John 3:1',         title:'Children of God'            },
      { ref:'Romans 8:38-39',     title:'Nothing can separate us'    },
    ],
  },
  {
    id: 'wisdom',
    name: 'Wisdom',
    icon: '📖',
    color: '#C77DFF',
    description: 'Growing in godly understanding',
    passages: [
      { ref:'Proverbs 1:7',       title:'Fear of the Lord'           },
      { ref:'James 1:5',          title:'Ask God for wisdom'         },
      { ref:'Proverbs 3:13-18',   title:'Blessed is the one'         },
      { ref:'Colossians 2:3',     title:'Hidden in Christ'           },
      { ref:'Psalm 111:10',       title:'Wisdom begins here'         },
      { ref:'Proverbs 4:7',       title:'Get wisdom above all'       },
      { ref:'1 Corinthians 1:25', title:'Foolishness of God'         },
      { ref:'Ecclesiastes 12:13', title:'Fear God keep commands'     },
      { ref:'Romans 11:33',       title:'Depths of God\'s wisdom'    },
      { ref:'Isaiah 55:8-9',      title:'His ways are higher'        },
      { ref:'Proverbs 16:9',      title:'Man plans, God directs'     },
      { ref:'Matthew 7:24-27',    title:'Wise and foolish builders'  },
      { ref:'Job 28:28',          title:'Wisdom defined'             },
      { ref:'Psalm 90:12',        title:'Teach us to number our days'},
    ],
  },
  {
    id: 'purpose',
    name: 'Purpose',
    icon: '🌱',
    color: '#4A7C5F',
    description: 'Living the life you were made for',
    passages: [
      { ref:'Jeremiah 29:11',     title:'Plans to give you hope'     },
      { ref:'Romans 8:28',        title:'All things work together'   },
      { ref:'Ephesians 2:10',     title:'Created for good works'     },
      { ref:'Psalm 138:8',        title:'He will fulfil his purpose' },
      { ref:'Isaiah 46:10',       title:'My purpose will stand'      },
      { ref:'Philippians 2:13',   title:'God works in you'           },
      { ref:'Matthew 5:13-16',    title:'Salt and light'             },
      { ref:'1 Corinthians 10:31',title:'Do it all for God\'s glory' },
      { ref:'Colossians 3:23',    title:'Work for the Lord'          },
      { ref:'Romans 12:2',        title:'Renew your mind'            },
      { ref:'Psalm 37:4',         title:'Delight in the Lord'        },
      { ref:'Proverbs 19:21',     title:'God\'s purpose prevails'    },
      { ref:'Acts 13:36',         title:'David served his purpose'   },
      { ref:'John 15:16',         title:'You did not choose me'      },
    ],
  },
  {
    id: 'hope',
    name: 'Hope',
    icon: '☀️',
    color: '#E8A838',
    description: 'Anchored hope in every storm',
    passages: [
      { ref:'Romans 5:3-5',       title:'Hope does not disappoint'   },
      { ref:'Hebrews 6:19',       title:'Anchor for the soul'        },
      { ref:'Jeremiah 29:11',     title:'A future and a hope'        },
      { ref:'Psalm 31:24',        title:'Be strong and take heart'   },
      { ref:'Romans 15:13',       title:'God of hope fill you'       },
      { ref:'Isaiah 40:31',       title:'Renew your strength'        },
      { ref:'1 Peter 1:3',        title:'Living hope'                },
      { ref:'Lamentations 3:21-23',title:'Hope in his faithfulness'  },
      { ref:'Psalm 42:5',         title:'Put your hope in God'       },
      { ref:'John 16:33',         title:'Take heart I have overcome' },
      { ref:'Revelation 21:4',    title:'No more tears'              },
      { ref:'Romans 8:24-25',     title:'Saved in hope'              },
      { ref:'Titus 2:13',         title:'Blessed hope'               },
      { ref:'Psalm 130:5',        title:'I wait for the Lord'        },
    ],
  },
  {
    id: 'love',
    name: 'Love',
    icon: '❤️',
    color: '#E84060',
    description: 'The greatest commandment',
    passages: [
      { ref:'1 Corinthians 13:4-7', title:'Love is patient'          },
      { ref:'John 3:16',           title:'God so loved the world'    },
      { ref:'Romans 5:8',          title:'While we were sinners'     },
      { ref:'1 John 4:8',          title:'God is love'               },
      { ref:'John 15:13',          title:'Greater love has no one'   },
      { ref:'Matthew 22:37-39',    title:'Greatest commandment'      },
      { ref:'1 John 4:19',         title:'We love because he loved'  },
      { ref:'Ephesians 3:17-19',   title:'Rooted in love'            },
      { ref:'Romans 8:35-39',      title:'Nothing separates from love'},
      { ref:'Song of Solomon 2:4', title:'His banner over me is love'},
      { ref:'Zephaniah 3:17',      title:'He rejoices over you'      },
      { ref:'John 13:34-35',       title:'Love one another'          },
      { ref:'1 Peter 4:8',         title:'Love covers sin'           },
      { ref:'Galatians 5:22',      title:'Fruit of the Spirit: love' },
    ],
  },
]

// ─────────────────────────────────────────────
//  CHARACTERS — passage journeys
// ─────────────────────────────────────────────
export const CHARACTERS = [
  {
    id: 'jesus',
    name: 'Jesus',
    icon: '✝️',
    color: '#5B4FCF',
    description: 'The life and ministry of Christ',
    passages: [
      { ref:'Luke 2:1-20',        title:'The birth of Jesus'        },
      { ref:'Matthew 3:13-17',    title:'Baptism of Jesus'          },
      { ref:'Matthew 4:1-11',     title:'Temptation in the desert'  },
      { ref:'Luke 4:16-21',       title:'His mission declared'      },
      { ref:'John 2:1-11',        title:'First miracle — water to wine'},
      { ref:'Matthew 5:1-12',     title:'Sermon on the Mount'       },
      { ref:'John 4:1-26',        title:'Woman at the well'         },
      { ref:'Mark 4:35-41',       title:'Calming the storm'         },
      { ref:'John 11:1-44',       title:'Raising of Lazarus'        },
      { ref:'Luke 15:11-32',      title:'Parable of the prodigal son'},
      { ref:'Matthew 21:1-11',    title:'Triumphal entry'           },
      { ref:'John 13:1-17',       title:'Washing the disciples\' feet'},
      { ref:'Luke 22:39-46',      title:'Gethsemane'                },
      { ref:'John 19:16-30',      title:'The crucifixion'           },
      { ref:'John 20:1-18',       title:'The resurrection'          },
      { ref:'Luke 24:13-35',      title:'Road to Emmaus'            },
      { ref:'John 21:15-17',      title:'Feed my sheep'             },
      { ref:'Matthew 28:18-20',   title:'Great commission'          },
    ],
  },
  {
    id: 'david',
    name: 'David',
    icon: '👑',
    color: '#E8A838',
    description: 'A man after God\'s own heart',
    passages: [
      { ref:'1 Samuel 16:1-13',   title:'David anointed king'       },
      { ref:'1 Samuel 17:1-50',   title:'David and Goliath'         },
      { ref:'1 Samuel 18:1-9',    title:'David and Jonathan'        },
      { ref:'1 Samuel 24:1-22',   title:'David spares Saul'         },
      { ref:'2 Samuel 5:1-5',     title:'David becomes king'        },
      { ref:'Psalm 23',           title:'The Lord is my shepherd'   },
      { ref:'2 Samuel 11:1-17',   title:'David and Bathsheba'       },
      { ref:'Psalm 51',           title:'David\'s repentance'       },
      { ref:'2 Samuel 12:13-25',  title:'Restoration'               },
      { ref:'Psalm 27',           title:'The Lord is my light'      },
      { ref:'1 Kings 2:1-4',      title:'David\'s charge to Solomon'},
      { ref:'Psalm 139',          title:'You formed me'             },
      { ref:'Acts 13:22',         title:'A man after God\'s heart'  },
    ],
  },
  {
    id: 'paul',
    name: 'Paul',
    icon: '✉️',
    color: '#5B4FCF',
    description: 'From persecutor to apostle',
    passages: [
      { ref:'Acts 7:58',          title:'Paul at Stephen\'s death'  },
      { ref:'Acts 9:1-19',        title:'Paul\'s conversion'        },
      { ref:'Galatians 1:11-24',  title:'Paul\'s testimony'         },
      { ref:'Acts 13:1-3',        title:'Sent on mission'           },
      { ref:'Acts 16:16-40',      title:'Philippian jail'           },
      { ref:'Acts 17:16-34',      title:'Paul in Athens'            },
      { ref:'Romans 1:1-17',      title:'The gospel of God'         },
      { ref:'Romans 8:1-17',      title:'Life through the Spirit'   },
      { ref:'2 Corinthians 11:23-28', title:'Paul\'s sufferings'    },
      { ref:'2 Corinthians 12:7-10',  title:'Grace is sufficient'   },
      { ref:'Philippians 1:12-26',    title:'To live is Christ'     },
      { ref:'Philippians 4:10-13',    title:'I have learned contentment'},
      { ref:'2 Timothy 4:6-8',    title:'I have finished the race'  },
    ],
  },
  {
    id: 'moses',
    name: 'Moses',
    icon: '🏔️',
    color: '#4A7C5F',
    description: 'From prince to deliverer',
    passages: [
      { ref:'Exodus 2:1-10',      title:'Birth of Moses'            },
      { ref:'Exodus 3:1-12',      title:'The burning bush'          },
      { ref:'Exodus 14:10-31',    title:'Crossing the Red Sea'      },
      { ref:'Exodus 16:1-15',     title:'Manna from heaven'         },
      { ref:'Exodus 20:1-17',     title:'The Ten Commandments'      },
      { ref:'Exodus 33:12-23',    title:'Moses sees God\'s glory'   },
      { ref:'Numbers 12:3',       title:'The humblest man'          },
      { ref:'Numbers 20:7-13',    title:'Moses strikes the rock'    },
      { ref:'Deuteronomy 6:1-9',  title:'Love the Lord your God'    },
      { ref:'Deuteronomy 34:1-8', title:'Death of Moses'            },
      { ref:'Hebrews 11:24-26',   title:'Moses\' faith'             },
    ],
  },
  {
    id: 'esther',
    name: 'Esther',
    icon: '👸',
    color: '#C77DFF',
    description: 'For such a time as this',
    passages: [
      { ref:'Esther 1:1-12',      title:'King Ahasuerus\'s feast'   },
      { ref:'Esther 2:1-18',      title:'Esther becomes queen'      },
      { ref:'Esther 3:1-15',      title:'Haman\'s plot'             },
      { ref:'Esther 4:1-17',      title:'For such a time as this'   },
      { ref:'Esther 5:1-8',       title:'Esther approaches the king'},
      { ref:'Esther 6:1-13',      title:'Mordecai honoured'         },
      { ref:'Esther 7:1-10',      title:'Haman exposed'             },
      { ref:'Esther 8:1-17',      title:'The king\'s decree'        },
      { ref:'Esther 9:20-28',     title:'Purim established'         },
    ],
  },
  {
    id: 'peter',
    name: 'Peter',
    icon: '⚓',
    color: '#7CB9E8',
    description: 'From fisherman to rock',
    passages: [
      { ref:'Luke 5:1-11',        title:'The call of Peter'         },
      { ref:'Matthew 14:22-33',   title:'Walking on water'          },
      { ref:'Matthew 16:13-19',   title:'You are the Christ'        },
      { ref:'John 13:1-9',        title:'Peter and foot washing'    },
      { ref:'Matthew 26:69-75',   title:'Peter\'s denial'           },
      { ref:'John 21:15-19',      title:'Peter restored'            },
      { ref:'Acts 2:14-41',       title:'Peter at Pentecost'        },
      { ref:'Acts 10:9-48',       title:'The Gentiles receive the Spirit'},
      { ref:'1 Peter 1:3-9',      title:'Living hope'               },
      { ref:'1 Peter 5:6-11',     title:'Humble yourselves'         },
    ],
  },
  {
    id: 'ruth',
    name: 'Ruth',
    icon: '🌾',
    color: '#4A7C5F',
    description: 'Loyalty, redemption, faithfulness',
    passages: [
      { ref:'Ruth 1:1-22',        title:'Where you go I will go'    },
      { ref:'Ruth 2:1-23',        title:'Ruth and Boaz'             },
      { ref:'Ruth 3:1-18',        title:'The threshing floor'       },
      { ref:'Ruth 4:1-22',        title:'Redemption complete'       },
      { ref:'Proverbs 31:10-31',  title:'A woman of noble character'},
    ],
  },
  {
    id: 'abraham',
    name: 'Abraham',
    icon: '⭐',
    color: '#E8A838',
    description: 'Father of faith, friend of God',
    passages: [
      { ref:'Genesis 12:1-9',     title:'The call of Abraham'       },
      { ref:'Genesis 15:1-6',     title:'Covenant with Abraham'     },
      { ref:'Genesis 17:1-8',     title:'Abraham\'s new name'       },
      { ref:'Genesis 18:1-15',    title:'Promise of a son'          },
      { ref:'Genesis 22:1-18',    title:'Abraham and Isaac'         },
      { ref:'Romans 4:1-5',       title:'Righteousness through faith'},
      { ref:'Hebrews 11:8-12',    title:'Abraham\'s faith'          },
      { ref:'James 2:21-24',      title:'Faith and works'           },
    ],
  },
]

// ─────────────────────────────────────────────
//  TEMPLATES — starting points for plan creation
// ─────────────────────────────────────────────
export const PLAN_TEMPLATES = [
  {
    id:           'romans-14',
    name:         'Romans in 14 Days',
    description:  'Walk through Paul\'s masterpiece on grace, faith, and salvation.',
    icon:         '✉️',
    color:        '#5B4FCF',
    durationDays: 14,
    mode:         'book',
    preset:       { books: ['Romans'] },
  },
  {
    id:           'proverbs-30',
    name:         'My Church is Studying Proverbs',
    description:  'One chapter of wisdom per day for a month.',
    icon:         '📖',
    color:        '#4A7C5F',
    durationDays: 30,
    mode:         'book',
    preset:       { books: ['Proverbs'] },
  },
  {
    id:           'couples-14',
    name:         'Couples Devotional Challenge',
    description:  'Psalms and Proverbs on love, partnership, and walking with God together.',
    icon:         '💑',
    color:        '#E84060',
    durationDays: 14,
    mode:         'topic',
    preset:       { topicId: 'love' },
  },
  {
    id:           '100-day',
    name:         '100-Day Bible Challenge',
    description:  'A curated journey through the whole story of Scripture.',
    icon:         '🏆',
    color:        '#E8A838',
    durationDays: 100,
    mode:         'topic',
    preset:       { topicId: 'faith' },
  },
  {
    id:           'life-of-jesus',
    name:         'Life of Jesus',
    description:  'Walk through the ministry, death, and resurrection of Christ.',
    icon:         '✝️',
    color:        '#7CB9E8',
    durationDays: 18,
    mode:         'character',
    preset:       { characterId: 'jesus' },
  },
]

// ─────────────────────────────────────────────
//  Day generation helpers
// ─────────────────────────────────────────────

/** Distribute Bible book chapters evenly across N days */
export function booksTodays(selectedBooks, totalDays) {
  const allChapters = []
  for (const book of selectedBooks) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      allChapters.push({ book: book.name, chapter: ch })
    }
  }
  if (!allChapters.length || !totalDays) return []

  const days = []
  const perDay = allChapters.length / totalDays

  for (let d = 0; d < totalDays; d++) {
    const startIdx = Math.floor(d * perDay)
    const endIdx   = Math.min(Math.floor((d + 1) * perDay), allChapters.length) - 1
    const slice    = allChapters.slice(startIdx, endIdx + 1)
    if (!slice.length) {
      days.push({ day_number:d+1, passage_reference:'', title:`Day ${d+1}` })
      continue
    }
    const first = slice[0]
    const last  = slice[slice.length - 1]
    const ref   = slice.length === 1
      ? `${first.book} ${first.chapter}`
      : first.book === last.book
        ? `${first.book} ${first.chapter}–${last.chapter}`
        : `${first.book} ${first.chapter} – ${last.book} ${last.chapter}`
    days.push({
      day_number:        d + 1,
      passage_reference: ref,
      book:              first.book,
      chapter_start:     first.chapter,
      chapter_end:       last.chapter,
      title:             ref,
    })
  }
  return days
}

/** Distribute topic passages across N days */
export function topicToDays(topic, totalDays) {
  if (!topic?.passages?.length) return []
  const passages = topic.passages
  const days = []
  for (let d = 0; d < totalDays; d++) {
    const p = passages[d % passages.length]
    days.push({
      day_number:        d + 1,
      passage_reference: p.ref,
      title:             p.title || p.ref,
    })
  }
  return days
}

/** Distribute character passages across N days */
export function characterToDays(character, totalDays) {
  if (!character?.passages?.length) return []
  return topicToDays({ passages: character.passages }, totalDays)
}

/** Generate short readable invite code: ROM-4X9K */
export function generateInviteCode(planName) {
  const prefix  = (planName || 'PLN').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  const suffix  = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, '0')
  return `${prefix}-${suffix}`
}