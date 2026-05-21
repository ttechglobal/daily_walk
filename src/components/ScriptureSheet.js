'use client'

// ── src/components/ScriptureSheet.js ──
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, ExternalLink, Loader2 } from 'lucide-react'
import { fetchScripture } from '../lib/scripture'

export default function ScriptureSheet({ reference, onClose }) {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!reference) return
    setLoading(true); setResult(null)
    fetchScripture(reference)
      .then(r => { setResult(r); setLoading(false) })
      .catch(() => { setResult({ error:'failed' }); setLoading(false) })
  }, [reference?.key])

  if (!reference) return null

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/50 z-[80]"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}/>
      <motion.div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-[28px] z-[90] flex flex-col"
        style={{ maxHeight:'78dvh', paddingBottom:'max(1.5rem,env(safe-area-inset-bottom))' }}
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:340, damping:36 }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50">
              <BookOpen size={15} className="text-purple-600"/>
            </div>
            <p className="font-bold text-[15px] text-gray-900">{reference.display}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} className="text-gray-500"/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && <div className="flex justify-center py-12"><Loader2 size={22} className="text-purple-500 animate-spin"/></div>}
          {!loading && result?.content && (
            <p className="text-[17px] leading-[1.9] text-gray-800 italic font-serif">
              "{result.content}"
            </p>
          )}
          {!loading && !result?.content && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="font-bold text-[15px] text-gray-800">{reference.display}</p>
              <p className="text-[13px] text-gray-500">Open in YouVersion to read this passage.</p>
              <a href={`https://www.bible.com/bible/1/${reference.book?.toLowerCase().replace(/\s+/g,'')}/${reference.chapter}/${reference.verse||1}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 text-white text-[13px] font-bold">
                Open in YouVersion <ExternalLink size={13}/>
              </a>
            </div>
          )}
        </div>
        {!loading && result?.content && (
          <div className="px-5 pt-3 border-t border-gray-100 flex-shrink-0">
            <a href={`/read?book=${encodeURIComponent(reference.book)}&chapter=${reference.chapter}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-purple-600 text-purple-600 text-[13px] font-bold">
              <BookOpen size={14}/> Read in Daily Walk Bible
            </a>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}