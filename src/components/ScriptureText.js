'use client'

// ── src/components/ScriptureText.js ──
import { useMemo } from 'react'
import { parseScriptureRefs } from '../lib/scripture'
import { BookOpen } from 'lucide-react'

export default function ScriptureText({ content, onRefTap, className = '' }) {
  const segments = useMemo(() => {
    if (!content) return []
    const refs = parseScriptureRefs(content)
    if (!refs.length) return [{ type:'text', value:content }]
    const parts = []
    let cursor = 0
    for (const ref of refs) {
      if (ref.index > cursor) parts.push({ type:'text', value:content.slice(cursor, ref.index) })
      parts.push({ type:'ref', ref })
      cursor = ref.index + ref.raw.length
    }
    if (cursor < content.length) parts.push({ type:'text', value:content.slice(cursor) })
    return parts
  }, [content])

  if (!segments.length) return null

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <button key={i}
            onClick={e => { e.stopPropagation(); onRefTap?.(seg.ref) }}
            className="inline-flex items-center gap-0.5 mx-0.5 px-2 py-0.5 rounded-full align-middle active:scale-95 transition-all"
            style={{ background:'#EDE9FF', color:'#5B4FCF', fontSize:'0.8em', fontWeight:700,
                     lineHeight:'1.6', verticalAlign:'middle', whiteSpace:'nowrap' }}>
            <BookOpen size={10} style={{ flexShrink:0 }}/>
            {seg.ref.display}
          </button>
        )
      )}
    </span>
  )
}