'use client'

// ── src/components/BibleReader.js ──
// Inline Bible Reader bottom sheet — v4 (bib-first).
// Search by book name or reference → fetches from IndexedDB / Supabase Storage.

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, BookOpen, Languages } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  getActiveTranslation,
  getDownloadedSet,
  TRANSLATIONS,
} from '../lib/bib-translations'
import { getChapter, BIBLE_BOOK_LIST, normaliseBookId } from '../lib/bible'

const DEFAULT_BOOK    = 'John'
const DEFAULT_CHAPTER = 3

// Parse a user query like "John 3" or "Genesis 1" or "Ps 23"
function parseQuery(q) {
  const s = q.trim()
  // "Book Chapter" pattern
  const m = s.match(/^(.+?)\s+(\d+)(?:[:.](\d+))?$/)
  if (m) {
    return {
      bookId:  normaliseBookId(m[1]),
      bookName: m[1].trim(),
      chapter: parseInt(m[2]),
    }
  }
  // Just a book name
  const bookId = normaliseBookId(s)
  if (bookId !== 'JHN' || s.toLowerCase().startsWith('j')) {
    return { bookId, bookName:s, chapter:1 }
  }
  return null
}

export default function BibleReader({ isOpen, onClose, onMarkRead }) {
  const router           = useRouter()
  const [query, setQuery]           = useState('John 3')
  const [translationId,setTid]      = useState(getActiveTranslation())
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [showTrans, setShowTrans]   = useState(false)
  const inputRef                    = useRef(null)

  const downloaded = getDownloadedSet()
  const available  = TRANSLATIONS.filter(t => downloaded.has(t.id))

  useEffect(() => {
    if (isOpen) {
      setTid(getActiveTranslation())
      fetchPassage('John 3', getActiveTranslation())
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function fetchPassage(q = query, tid = translationId) {
    const parsed = parseQuery(q)
    if (!parsed) { setError('Try something like "John 3" or "Psalm 23"'); return }

    setLoading(true); setError(null); setResult(null)
    try {
      const data = await getChapter(parsed.bookId, parsed.chapter, tid)
      if (data.offline) { setError('You\'re offline — this chapter isn\'t cached yet'); return }
      if (data.error)   { setError('Passage not found — try again'); return }
      setResult(data)
    } catch {
      setError('Couldn\'t load passage — try again')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    fetchPassage(query, translationId)
  }

  function handleTranslation(id) {
    setTid(id)
    setShowTrans(false)
    if (result) fetchPassage(query, id)
  }

  function handleMarkRead() {
    const ref = result
      ? `${result.book} ${result.chapter}`
      : query
    onMarkRead?.(ref)
    onClose()
  }

  function openInReader() {
    if (!result) return
    router.push(`/read?book=${encodeURIComponent(result.book)}&chapter=${result.chapter}`)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={onClose}/>

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white rounded-t-[28px] z-50 flex flex-col"
            style={{maxHeight:'92dvh'}}
            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
            transition={{type:'spring',stiffness:340,damping:36}}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full"/>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-purple-600"/>
                <span className="font-bold text-[17px] text-gray-900">Bible Reader</span>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={16} className="text-gray-500"/>
              </button>
            </div>

            {/* Search + translation */}
            <div className="px-4 pb-3 flex flex-col gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="e.g. John 3, Psalm 23"
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-[12px] text-[14px] text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-gray-400 bg-white"
                  />
                </div>
                <button type="submit"
                  className="px-4 py-3 bg-purple-600 text-white rounded-[12px] text-[14px] font-bold hover:bg-purple-700 active:scale-95 transition-all">
                  Go
                </button>
              </form>

              {/* Translation picker */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500 font-semibold">Translation:</span>
                {available.length === 0 ? (
                  <button onClick={() => { onClose(); router.push('/translations') }}
                    className="text-[12px] font-bold text-purple-600 underline">
                    Download a Bible
                  </button>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {available.map(tr => (
                      <button key={tr.id}
                        onClick={() => handleTranslation(tr.id)}
                        className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all ${
                          translationId===tr.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}>
                        {tr.abbreviation}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100 mx-4"/>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {/* Loading */}
              {loading && (
                <div className="flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3"/>
                  {[...Array(6)].map((_,i) => (
                    <div key={i} className="h-3 bg-gray-100 rounded"
                      style={{width:`${70+Math.random()*30}%`}}/>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <BookOpen size={32} className="text-gray-300"/>
                  <p className="text-gray-500 text-[14px]">{error}</p>
                </div>
              )}

              {/* Verses */}
              {result && !loading && !error && (
                <>
                  <div className="mb-4">
                    <p className="font-bold text-[18px] text-gray-900">
                      {result.book} {result.chapter}
                    </p>
                    <p className="text-[12px] text-gray-400 mt-0.5">{translationId}</p>
                  </div>

                  <p className="text-[15px] text-gray-800 leading-[2]">
                    {(result.verses||[]).map((v,i) => (
                      <span key={i}>
                        <sup className="text-purple-500 font-bold text-[10px] mr-0.5"
                          style={{verticalAlign:'super',lineHeight:0}}>
                          {v.number}
                        </sup>
                        {v.text}{' '}
                      </span>
                    ))}
                  </p>

                  <div className="flex gap-2 mt-5">
                    <button onClick={openInReader}
                      className="flex-1 py-2.5 rounded-[12px] font-bold text-[13px] text-purple-600 border-2 border-purple-200 active:scale-95 transition-all">
                      Open Full Reader
                    </button>
                    <button onClick={handleMarkRead}
                      className="flex-1 py-2.5 rounded-[12px] font-bold text-[13px] text-white bg-purple-600 active:scale-95 transition-all">
                      Mark as Read ✓
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}