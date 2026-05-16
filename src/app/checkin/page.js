'use client'

// ── src/app/checkin/page.js ──
// Redesigned check-in:
//   1. Bible selector — Book → Chapter → Verse (optional)
//   2. Multiple chapter entries allowed
//   3. Reflection text
//   4. "What stood out" stays
//   5. Challenge tag REMOVED
//   6. After save → optional Community Share step (multi-select)
// Full dark mode support via useDarkMode().

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronDown, Plus, X as XIcon,
  MessageSquare, Heart, CheckCircle2,
  Users, Globe, ChevronRight, ChevronUp, Flame,
} from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useCheckin } from '../../hooks/useCheckin'
import { ToastContainer, showToast } from '../../components/Toast'
import { getNotificationSettings } from '../../lib/notifications'
import { BIBLE_BOOKS } from '../../lib/constants'
import { useDarkMode, getDarkModeColors } from '../../contexts/DarkModeContext'

// ─────────────────────────────────────────────
//  Bible book list (fallback if BIBLE_BOOKS not exported)
// ─────────────────────────────────────────────
const BOOKS = (typeof BIBLE_BOOKS !== 'undefined' && Array.isArray(BIBLE_BOOKS) && BIBLE_BOOKS.length > 0)
  ? BIBLE_BOOKS
  : [
    // OT
    {name:'Genesis',chapters:50},{name:'Exodus',chapters:40},{name:'Leviticus',chapters:27},
    {name:'Numbers',chapters:36},{name:'Deuteronomy',chapters:34},{name:'Joshua',chapters:24},
    {name:'Judges',chapters:21},{name:'Ruth',chapters:4},{name:'1 Samuel',chapters:31},
    {name:'2 Samuel',chapters:24},{name:'1 Kings',chapters:22},{name:'2 Kings',chapters:25},
    {name:'1 Chronicles',chapters:29},{name:'2 Chronicles',chapters:36},{name:'Ezra',chapters:10},
    {name:'Nehemiah',chapters:13},{name:'Esther',chapters:10},{name:'Job',chapters:42},
    {name:'Psalms',chapters:150},{name:'Proverbs',chapters:31},{name:'Ecclesiastes',chapters:12},
    {name:'Song of Solomon',chapters:8},{name:'Isaiah',chapters:66},{name:'Jeremiah',chapters:52},
    {name:'Lamentations',chapters:5},{name:'Ezekiel',chapters:48},{name:'Daniel',chapters:12},
    {name:'Hosea',chapters:14},{name:'Joel',chapters:3},{name:'Amos',chapters:9},
    {name:'Obadiah',chapters:1},{name:'Jonah',chapters:4},{name:'Micah',chapters:7},
    {name:'Nahum',chapters:3},{name:'Habakkuk',chapters:3},{name:'Zephaniah',chapters:3},
    {name:'Haggai',chapters:2},{name:'Zechariah',chapters:14},{name:'Malachi',chapters:4},
    // NT
    {name:'Matthew',chapters:28},{name:'Mark',chapters:16},{name:'Luke',chapters:24},
    {name:'John',chapters:21},{name:'Acts',chapters:28},{name:'Romans',chapters:16},
    {name:'1 Corinthians',chapters:16},{name:'2 Corinthians',chapters:13},{name:'Galatians',chapters:6},
    {name:'Ephesians',chapters:6},{name:'Philippians',chapters:4},{name:'Colossians',chapters:4},
    {name:'1 Thessalonians',chapters:5},{name:'2 Thessalonians',chapters:3},{name:'1 Timothy',chapters:6},
    {name:'2 Timothy',chapters:4},{name:'Titus',chapters:3},{name:'Philemon',chapters:1},
    {name:'Hebrews',chapters:13},{name:'James',chapters:5},{name:'1 Peter',chapters:5},
    {name:'2 Peter',chapters:3},{name:'1 John',chapters:5},{name:'2 John',chapters:1},
    {name:'3 John',chapters:1},{name:'Jude',chapters:1},{name:'Revelation',chapters:22},
  ]

// ─────────────────────────────────────────────
//  Book/Chapter picker sheet
// ─────────────────────────────────────────────
function BookChapterPicker({ onSelect, onClose, dark, c }) {
  const [bookSearch, setBookSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [step, setStep] = useState('book') // 'book' | 'chapter' | 'verse'
  const [chapter, setChapter] = useState(null)

  const filtered = BOOKS.filter(b =>
    b.name.toLowerCase().includes(bookSearch.toLowerCase())
  )

  function handleBook(book) {
    setSelectedBook(book)
    setStep('chapter')
  }

  function handleChapter(ch) {
    setChapter(ch)
    setStep('verse')
  }

  function handleVerse(verse) {
    const ref = verse
      ? `${selectedBook.name} ${chapter}:${verse}`
      : `${selectedBook.name} ${chapter}`
    onSelect(ref)
    onClose()
  }

  const chapCount = selectedBook?.chapters || 0

  return (
    <motion.div className="fixed inset-0 bg-black/50 z-[70] flex items-end"
      initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="w-full max-w-[480px] mx-auto rounded-t-[28px] flex flex-col"
        style={{maxHeight:'82dvh', background: c.bgCard}}
        initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',stiffness:340,damping:36}}
        onClick={e=>e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{background: c.border}}/>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 border-b" style={{borderColor: c.border}}>
          {step !== 'book' && (
            <button onClick={() => {
              if (step === 'verse') setStep('chapter')
              else { setStep('book'); setSelectedBook(null) }
            }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background: c.bgMuted}}>
              <ChevronRight size={15} style={{color: c.textMuted, transform:'rotate(180deg)'}}/>
            </button>
          )}
          <p className="font-bold text-[16px] flex-1" style={{color: c.text}}>
            {step==='book' ? 'Select Book' : step==='chapter' ? `${selectedBook.name} — Select Chapter` : `Chapter ${chapter} — Select Verse`}
          </p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background: c.bgMuted}}>
            <XIcon size={14} style={{color: c.textMuted}}/>
          </button>
        </div>

        {/* Search (books only) */}
        {step === 'book' && (
          <div className="px-4 py-3 flex-shrink-0">
            <input value={bookSearch} onChange={e=>setBookSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full px-4 py-2.5 rounded-full text-[14px] focus:outline-none"
              style={{background: c.bgMuted, color: c.text, border: `1px solid ${c.borderInput}`}}/>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 pb-8">
          {step === 'book' && (
            <div className="flex flex-col gap-1">
              {filtered.map(book => (
                <button key={book.name} onClick={() => handleBook(book)}
                  className="flex items-center justify-between px-4 py-3 rounded-[14px] text-left transition-all active:scale-[0.98]"
                  style={{background: c.bgCardAlt}}>
                  <span className="font-semibold text-[14px]" style={{color: c.text}}>{book.name}</span>
                  <span className="text-[12px]" style={{color: c.textFaint}}>{book.chapters} ch</span>
                </button>
              ))}
            </div>
          )}

          {step === 'chapter' && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({length: chapCount}, (_,i) => i+1).map(ch => (
                <button key={ch} onClick={() => handleChapter(ch)}
                  className="aspect-square rounded-[12px] flex items-center justify-center font-bold text-[14px] transition-all active:scale-90"
                  style={{background: c.bgCardAlt, color: c.text}}>
                  {ch}
                </button>
              ))}
            </div>
          )}

          {step === 'verse' && (
            <div className="flex flex-col gap-3">
              <button onClick={() => handleVerse(null)}
                className="w-full px-4 py-3.5 rounded-[14px] font-bold text-[14px] text-white text-center"
                style={{background: '#5B4FCF'}}>
                Full chapter — {selectedBook.name} {chapter}
              </button>
              <p className="text-[12px] text-center font-semibold" style={{color: c.textMuted}}>or select a specific verse</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({length: 40}, (_,i) => i+1).map(v => (
                  <button key={v} onClick={() => handleVerse(v)}
                    className="aspect-square rounded-[12px] flex items-center justify-center font-semibold text-[13px] transition-all active:scale-90"
                    style={{background: c.bgCardAlt, color: c.text}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Bible reading entry row
// ─────────────────────────────────────────────
function ReadingEntry({ entry, onRemove, onTap, c, idx }) {
  return (
    <motion.div initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:idx*0.05}}
      className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
      style={{background: c.bgCardAlt}}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{background: '#EDE9FF'}}>
        <BookOpen size={13} style={{color:'#5B4FCF'}}/>
      </div>
      <button onClick={onTap} className="flex-1 text-left">
        <p className="font-bold text-[14px]" style={{color:'#5B4FCF'}}>{entry}</p>
      </button>
      <button onClick={onRemove} className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{background: c.bgMuted}}>
        <XIcon size={12} style={{color: c.textMuted}}/>
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Community share step — after saving
// ─────────────────────────────────────────────
function CommunityShareStep({ passages, reflection, onDone, c, dark }) {
  const [user] = useLocalStorage('dw_user', null)
  const [selected, setSelected] = useState(new Set())
  const [sharing, setSharing] = useState(false)

  // Mock communities for now — in production these come from Supabase
  const communities = [
    { id: 'global', name: 'All Daily Walk users', icon: '🌍', isMember: true },
  ]

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleShare() {
    if (selected.size === 0) { onDone(); return }
    setSharing(true)
    await new Promise(r => setTimeout(r, 400))
    showToast('Shared! 🙌')
    setSharing(false)
    onDone()
  }

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
      className="flex flex-col gap-5">

      {/* Check-in saved banner */}
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-[16px]"
        style={{background: '#E0FBEC'}}>
        <CheckCircle2 size={22} style={{color:'#4A7C5F', flexShrink:0}}/>
        <div>
          <p className="font-bold text-[14px]" style={{color:'#4A7C5F'}}>Check-in saved!</p>
          <p className="text-[12px] mt-0.5" style={{color:'#4A7C5F', opacity:0.8}}>
            {passages.join(' · ')}
          </p>
        </div>
      </div>

      <div>
        <p className="font-bold text-[16px] mb-1" style={{color: c.text}}>Share your reading?</p>
        <p className="text-[13px]" style={{color: c.textMuted}}>
          Encourage others by sharing what you read today. This is optional.
        </p>
      </div>

      {/* Community options */}
      <div className="flex flex-col gap-2">
        {communities.map(community => (
          <button key={community.id} onClick={() => toggle(community.id)}
            className="flex items-center gap-4 px-4 py-4 rounded-[16px] text-left transition-all"
            style={{
              background: selected.has(community.id) ? '#EDE9FF' : c.bgCard,
              border: `2px solid ${selected.has(community.id) ? '#5B4FCF' : c.border}`,
              boxShadow: c.shadow,
            }}>
            <span className="text-[24px] flex-shrink-0">{community.icon}</span>
            <p className="font-semibold text-[14px] flex-1" style={{color: c.text}}>{community.name}</p>
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                borderColor: selected.has(community.id) ? '#5B4FCF' : c.borderInput,
                background: selected.has(community.id) ? '#5B4FCF' : 'transparent',
              }}>
              {selected.has(community.id) && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Post preview */}
      {selected.size > 0 && reflection.trim() && (
        <div className="px-4 py-3 rounded-[14px] border-l-[3px]"
          style={{background: c.bgCardAlt, borderColor:'#5B4FCF'}}>
          <p className="text-[12px] font-bold uppercase tracking-wide mb-1" style={{color:'#5B4FCF'}}>Preview</p>
          <p className="text-[13px]" style={{color: c.textMuted}}>"{reflection.slice(0,120)}{reflection.length>120?'…':''}"</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2.5">
        <button onClick={handleShare} disabled={sharing}
          className="w-full py-4 rounded-full font-bold text-[15px] text-white disabled:opacity-60 transition-all active:scale-[0.97]"
          style={{background: selected.size > 0 ? '#5B4FCF' : '#9CA3AF'}}>
          {sharing ? 'Sharing…' : selected.size > 0 ? `Share to ${selected.size} place${selected.size>1?'s':''}` : 'Skip sharing'}
        </button>
        <button onClick={onDone}
          className="text-[13px] font-semibold text-center py-1"
          style={{color: c.textFaint}}>
          Skip — done
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
//  Main check-in screen
// ─────────────────────────────────────────────
export default function CheckinScreen() {
  const router  = useRouter()
  const { dark } = useDarkMode()
  const c = getDarkModeColors(dark)

  const { performCheckin, streak, checkins } = useCheckin()
  const [user] = useLocalStorage('dw_user', null)

  // State
  const [passages,    setPassages]    = useState([])     // array of Bible refs
  const [pickerOpen,  setPickerOpen]  = useState(false)  // book picker sheet
  const [reflection,  setReflection]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState('form') // 'form' | 'share'

  const today           = new Date().toISOString().split('T')[0]
  const displayStreak   = (streak?.current || 0) + (streak?.lastCheckinDate === today ? 0 : 1)
  const passageSummary  = passages.join(', ')

  function addPassage(ref) {
    if (!passages.includes(ref)) setPassages(prev => [...prev, ref])
  }
  function removePassage(ref) {
    setPassages(prev => prev.filter(p => p !== ref))
  }

  async function handleSave() {
    if (passages.length === 0) { showToast('Select at least one passage'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 280))
    const isFirstEver = !(checkins?.length > 0)
    performCheckin({ passage: passageSummary, reflection })
    if (isFirstEver && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dw-first-checkin'))
    }
    setSaving(false)
    setStep('share')
  }

  function handleDone() {
    showToast('Check-in complete! 🙏')
    router.push('/')
  }

  return (
    <div className="flex flex-col min-h-screen" style={{background: c.bg}}>
      <ToastContainer/>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
        <button onClick={() => step === 'share' ? setStep('form') : router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{background: c.bgCard, boxShadow: c.shadow}}>
          <ChevronRight size={18} style={{color: c.text, transform:'rotate(180deg)'}}/>
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-[20px]" style={{color: c.text}}>
            {step === 'share' ? 'Share your reading' : "Today's Check-In"}
          </h1>
          <p className="text-[12px] mt-0.5" style={{color: c.textMuted}}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </p>
        </div>
        {/* Streak badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{background: dark ? '#2A1A08' : '#FFF4DC'}}>
          <Flame size={14} style={{color:'#E8A838'}}/>
          <span className="font-bold text-[13px]" style={{color:'#E8A838'}}>{displayStreak}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="flex flex-col gap-4 pt-2">

              {/* What I read */}
              <div className="rounded-[20px] overflow-hidden" style={{background: c.bgCard, boxShadow: c.shadow}}>
                <div className="flex items-center gap-3 px-4 py-4 border-b" style={{borderColor: c.border}}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:'#EDE9FF'}}>
                    <BookOpen size={15} style={{color:'#5B4FCF'}}/>
                  </div>
                  <p className="font-bold text-[14px]" style={{color: c.text}}>What did I read?</p>
                </div>
                <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
                  {passages.length === 0 ? (
                    <p className="text-[13px] py-2" style={{color: c.textMuted}}>
                      No passages selected yet. Tap below to add.
                    </p>
                  ) : (
                    passages.map((ref, i) => (
                      <ReadingEntry key={ref} entry={ref} idx={i} onRemove={() => removePassage(ref)}
                        onTap={() => setPickerOpen(true)} c={c}/>
                    ))
                  )}
                  <button onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 rounded-[14px] border-2 border-dashed transition-all active:scale-[0.98]"
                    style={{borderColor: c.borderInput}}>
                    <Plus size={15} style={{color:'#5B4FCF'}}/>
                    <span className="text-[13px] font-semibold" style={{color:'#5B4FCF'}}>
                      {passages.length === 0 ? 'Add a Bible passage' : 'Add another passage'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Reflection */}
              <div className="rounded-[20px] overflow-hidden" style={{background: c.bgCard, boxShadow: c.shadow}}>
                <div className="flex items-center gap-3 px-4 py-4 border-b" style={{borderColor: c.border}}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:'#FFF4DC'}}>
                    <MessageSquare size={15} style={{color:'#E8A838'}}/>
                  </div>
                  <p className="font-bold text-[14px]" style={{color: c.text}}>What stood out?</p>
                  <span className="ml-auto text-[11px]" style={{color: c.textFaint}}>optional</span>
                </div>
                <div className="px-4 py-3">
                  <textarea value={reflection} onChange={e => setReflection(e.target.value)}
                    placeholder="A word, a verse, an impression — anything God placed on your heart..."
                    rows={4}
                    className="w-full text-[15px] leading-relaxed resize-none focus:outline-none"
                    style={{background:'transparent', color: c.text}}/>
                </div>
              </div>

              {/* Save CTA */}
              <button onClick={handleSave} disabled={saving || passages.length === 0}
                className="w-full py-4 rounded-full font-bold text-[15px] text-white transition-all active:scale-[0.97] disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#5B4FCF,#3D3190)'}}>
                {saving ? 'Saving…' : 'Save check-in →'}
              </button>
              <p className="text-[12px] text-center" style={{color: c.textFaint}}>
                Your check-in is saved to your Journey.
              </p>
            </motion.div>
          )}

          {step === 'share' && (
            <motion.div key="share" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="pt-2">
              <CommunityShareStep
                passages={passages} reflection={reflection}
                onDone={handleDone} c={c} dark={dark}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Book picker sheet */}
      <AnimatePresence>
        {pickerOpen && (
          <BookChapterPicker
            onSelect={addPassage}
            onClose={() => setPickerOpen(false)}
            dark={dark} c={c}/>
        )}
      </AnimatePresence>
    </div>
  )
}