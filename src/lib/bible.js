// ── src/lib/bible.js ── v5
// KJV always works online. Download = offline access only.

import {
  getActiveTranslation, setActiveTranslation,
  getChapterUrl, getDownloadedSet,
  DEFAULT_TRANSLATION, TRANSLATIONS,
} from './bib-translations'

export const BIBLE_BOOK_LIST = [
  {name:'Genesis',bookId:'GEN',chapters:50,testament:'OT'},{name:'Exodus',bookId:'EXO',chapters:40,testament:'OT'},
  {name:'Leviticus',bookId:'LEV',chapters:27,testament:'OT'},{name:'Numbers',bookId:'NUM',chapters:36,testament:'OT'},
  {name:'Deuteronomy',bookId:'DEU',chapters:34,testament:'OT'},{name:'Joshua',bookId:'JOS',chapters:24,testament:'OT'},
  {name:'Judges',bookId:'JDG',chapters:21,testament:'OT'},{name:'Ruth',bookId:'RUT',chapters:4,testament:'OT'},
  {name:'1 Samuel',bookId:'1SA',chapters:31,testament:'OT'},{name:'2 Samuel',bookId:'2SA',chapters:24,testament:'OT'},
  {name:'1 Kings',bookId:'1KI',chapters:22,testament:'OT'},{name:'2 Kings',bookId:'2KI',chapters:25,testament:'OT'},
  {name:'1 Chronicles',bookId:'1CH',chapters:29,testament:'OT'},{name:'2 Chronicles',bookId:'2CH',chapters:36,testament:'OT'},
  {name:'Ezra',bookId:'EZR',chapters:10,testament:'OT'},{name:'Nehemiah',bookId:'NEH',chapters:13,testament:'OT'},
  {name:'Esther',bookId:'EST',chapters:10,testament:'OT'},{name:'Job',bookId:'JOB',chapters:42,testament:'OT'},
  {name:'Psalms',bookId:'PSA',chapters:150,testament:'OT'},{name:'Proverbs',bookId:'PRO',chapters:31,testament:'OT'},
  {name:'Ecclesiastes',bookId:'ECC',chapters:12,testament:'OT'},{name:'Song of Solomon',bookId:'SNG',chapters:8,testament:'OT'},
  {name:'Isaiah',bookId:'ISA',chapters:66,testament:'OT'},{name:'Jeremiah',bookId:'JER',chapters:52,testament:'OT'},
  {name:'Lamentations',bookId:'LAM',chapters:5,testament:'OT'},{name:'Ezekiel',bookId:'EZK',chapters:48,testament:'OT'},
  {name:'Daniel',bookId:'DAN',chapters:12,testament:'OT'},{name:'Hosea',bookId:'HOS',chapters:14,testament:'OT'},
  {name:'Joel',bookId:'JOL',chapters:3,testament:'OT'},{name:'Amos',bookId:'AMO',chapters:9,testament:'OT'},
  {name:'Obadiah',bookId:'OBA',chapters:1,testament:'OT'},{name:'Jonah',bookId:'JON',chapters:4,testament:'OT'},
  {name:'Micah',bookId:'MIC',chapters:7,testament:'OT'},{name:'Nahum',bookId:'NAM',chapters:3,testament:'OT'},
  {name:'Habakkuk',bookId:'HAB',chapters:3,testament:'OT'},{name:'Zephaniah',bookId:'ZEP',chapters:3,testament:'OT'},
  {name:'Haggai',bookId:'HAG',chapters:2,testament:'OT'},{name:'Zechariah',bookId:'ZEC',chapters:14,testament:'OT'},
  {name:'Malachi',bookId:'MAL',chapters:4,testament:'OT'},{name:'Matthew',bookId:'MAT',chapters:28,testament:'NT'},
  {name:'Mark',bookId:'MRK',chapters:16,testament:'NT'},{name:'Luke',bookId:'LUK',chapters:24,testament:'NT'},
  {name:'John',bookId:'JHN',chapters:21,testament:'NT'},{name:'Acts',bookId:'ACT',chapters:28,testament:'NT'},
  {name:'Romans',bookId:'ROM',chapters:16,testament:'NT'},{name:'1 Corinthians',bookId:'1CO',chapters:16,testament:'NT'},
  {name:'2 Corinthians',bookId:'2CO',chapters:13,testament:'NT'},{name:'Galatians',bookId:'GAL',chapters:6,testament:'NT'},
  {name:'Ephesians',bookId:'EPH',chapters:6,testament:'NT'},{name:'Philippians',bookId:'PHP',chapters:4,testament:'NT'},
  {name:'Colossians',bookId:'COL',chapters:4,testament:'NT'},{name:'1 Thessalonians',bookId:'1TH',chapters:5,testament:'NT'},
  {name:'2 Thessalonians',bookId:'2TH',chapters:3,testament:'NT'},{name:'1 Timothy',bookId:'1TI',chapters:6,testament:'NT'},
  {name:'2 Timothy',bookId:'2TI',chapters:4,testament:'NT'},{name:'Titus',bookId:'TIT',chapters:3,testament:'NT'},
  {name:'Philemon',bookId:'PHM',chapters:1,testament:'NT'},{name:'Hebrews',bookId:'HEB',chapters:13,testament:'NT'},
  {name:'James',bookId:'JAS',chapters:5,testament:'NT'},{name:'1 Peter',bookId:'1PE',chapters:5,testament:'NT'},
  {name:'2 Peter',bookId:'2PE',chapters:3,testament:'NT'},{name:'1 John',bookId:'1JN',chapters:5,testament:'NT'},
  {name:'2 John',bookId:'2JN',chapters:1,testament:'NT'},{name:'3 John',bookId:'3JN',chapters:1,testament:'NT'},
  {name:'Jude',bookId:'JUD',chapters:1,testament:'NT'},{name:'Revelation',bookId:'REV',chapters:22,testament:'NT'},
]

const _A={}
for(const b of BIBLE_BOOK_LIST){_A[b.name.toLowerCase().replace(/\s+/g,'')]=b.bookId;_A[b.bookId.toLowerCase()]=b.bookId}
Object.assign(_A,{
  gen:'GEN',ex:'EXO',exo:'EXO',lev:'LEV',num:'NUM',deut:'DEU',deu:'DEU',josh:'JOS',jos:'JOS',judg:'JDG',
  rut:'RUT',ruth:'RUT','1sam':'1SA','2sam':'2SA','1ki':'1KI','2ki':'2KI','1chr':'1CH','2chr':'2CH',
  ezr:'EZR',neh:'NEH',est:'EST',esth:'EST',psa:'PSA',psalm:'PSA',psalms:'PSA',pro:'PRO',prov:'PRO',
  eccl:'ECC',ec:'ECC',ss:'SNG',sos:'SNG',isa:'ISA',jer:'JER',lam:'LAM',eze:'EZK',ezek:'EZK',dan:'DAN',
  hos:'HOS',joel:'JOL',amo:'AMO',oba:'OBA',jon:'JON',mic:'MIC',nah:'NAM',hab:'HAB',
  zep:'ZEP',zeph:'ZEP',hag:'HAG',zec:'ZEC',zech:'ZEC',mal:'MAL',
  matt:'MAT',mt:'MAT',matthew:'MAT',mrk:'MRK',mk:'MRK',mar:'MRK',luk:'LUK',lk:'LUK',
  jhn:'JHN',jn:'JHN',joh:'JHN',john:'JHN',act:'ACT',acts:'ACT',rom:'ROM',ro:'ROM',
  '1cor':'1CO','1co':'1CO','2cor':'2CO','2co':'2CO',gal:'GAL',eph:'EPH',php:'PHP',phil:'PHP',col:'COL',
  '1th':'1TH','1thess':'1TH','2th':'2TH','2thess':'2TH','1ti':'1TI','1tim':'1TI','2ti':'2TI','2tim':'2TI',
  tit:'TIT',phm:'PHM',phlm:'PHM',heb:'HEB',jas:'JAS',jam:'JAS',
  '1pe':'1PE','1pet':'1PE','1pt':'1PE','2pe':'2PE','2pet':'2PE','2pt':'2PE',
  '1jn':'1JN','1jo':'1JN','2jn':'2JN','3jn':'3JN',jud:'JUD',jude:'JUD',rev:'REV',re:'REV',revelation:'REV',
})

export function normaliseBookId(n){if(!n)return'JHN';return _A[String(n).trim().toLowerCase().replace(/\s+/g,'')]||'JHN'}
export function getBookByName(n){const id=normaliseBookId(n);return BIBLE_BOOK_LIST.find(b=>b.bookId===id)||BIBLE_BOOK_LIST.find(b=>b.bookId==='JHN')}

export function parseRef(ref){
  if(!ref)return{bookId:'JHN',chapter:1}
  const s=String(ref).trim()
  const u=s.match(/^([A-Z0-9]{2,3})\.(\d+)/)
  if(u)return{bookId:u[1],chapter:parseInt(u[2])}
  const t=s.match(/^(.+?)\s+(\d+)(?:[:.](\d+))?/)
  if(t)return{bookId:normaliseBookId(t[1]),chapter:parseInt(t[2]),verse:t[3]?parseInt(t[3]):undefined}
  return{bookId:'JHN',chapter:1}
}

export function passageToUsfm(ref){
  if(!ref)return null
  const{bookId,chapter}=parseRef(ref)
  if(!bookId||!chapter)return null
  return`${bookId}.${chapter}`
}

export async function getChapter(bookNameOrId,chapter,translationId){
  const bookId=normaliseBookId(bookNameOrId)
  const chapNum=parseInt(chapter)||1
  const tid=translationId||getActiveTranslation()||DEFAULT_TRANSLATION

  // 1. IndexedDB (downloaded — instant + offline)
  try{
    const{getCachedChapter}=await import('./bible-cache')
    const cached=await getCachedChapter(tid,bookId,chapNum)
    if(cached?.verses?.length)return{verses:cached.verses,book:cached.book||getBookByName(bookId)?.name,bookId,chapter:chapNum,translationId:tid,fromCache:true,source:'indexeddb'}
  }catch{}

  // 2. Offline and not cached
  if(typeof navigator!=='undefined'&&!navigator.onLine)return{error:'offline',offline:true,verses:[],bookId,chapter:chapNum,translationId:tid}

  // 3. Supabase Storage (always works online — no download needed)
  try{
    const url=getChapterUrl(tid,bookId,chapNum)
    const res=await fetch(url)
    if(!res.ok)throw new Error(`HTTP ${res.status}`)
    const data=await res.json()
    const verses=(data.verses||[]).map(v=>({number:v.n??v.number??0,text:v.t??v.text??''}))
    const result={verses,book:data.book||getBookByName(bookId)?.name,bookId,chapter:chapNum,translationId:tid,fromCache:false,source:'storage'}
    import('./bible-cache').then(({cacheChapter})=>cacheChapter(tid,bookId,chapNum,result,{priority:'opportunistic'}).catch(()=>null)).catch(()=>null)
    return result
  }catch(err){
    return{error:err.message,offline:false,verses:[],bookId,chapter:chapNum,translationId:tid}
  }
}

export async function getPassage(ref,translationId){const{bookId,chapter}=parseRef(ref);return getChapter(bookId,chapter,translationId)}
export async function isPassageCached(ref,translationId){
  const{bookId,chapter}=parseRef(ref)
  const tid=translationId||getActiveTranslation()
  try{const{isCached}=await import('./bible-cache');return await isCached(tid,bookId,chapter)}catch{return false}
}

export function getPreferredVersionId(){return getActiveTranslation()}
export function setPreferredVersionId(id){setActiveTranslation(id)}
export function getPreferredTranslation(){return getActiveTranslation()}
export function setPreferredTranslation(id){setActiveTranslation(id)}
export function getAllVersions(){const d=getDownloadedSet();return TRANSLATIONS.filter(t=>t.enabled).map(t=>({id:t.id,abbreviation:t.abbreviation,name:t.name,downloadable:true,source:'local',downloaded:d.has(t.id)}))}
export async function seedDefaultVersionIfNeeded(){}
export const DEFAULT_VERSION_ID=DEFAULT_TRANSLATION
export const DEFAULT_ABBR=DEFAULT_TRANSLATION
export function isVersionDownloaded(id){return getDownloadedSet().has(String(id))}