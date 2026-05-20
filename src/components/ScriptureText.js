'use client'

// ── src/components/ScriptureText.js ──
// Renders post body text with scripture references detected and converted
// to tappable chips. Non-scripture text renders as normal prose.
//
// Usage:
//   <ScriptureText content={post.content} onRefTap={ref => setOpenRef(ref)} />
//
// Each chip shows the canonical reference (e.g. "John 3:16") and calls
// onRefTap(ref) when tapped, where ref = { key, display, book, chapter, verse, endVerse }.

import { useMemo } from 'react'
import { parseScriptureRefs } from '../lib/scripture'
import { BookOpen } from 'lucide-react'

export default function ScriptureText({ content, onRefTap, className = '' }) {
  const segments = useMemo(() => {
    if (!content) return []
    const refs = parseScriptureRefs(content)
    if (!refs.length) return [{ type: 'text', value: content }]

    const parts = []
    let cursor = 0

    for (const ref of refs) {
      // Text before this reference
      if (ref.index > cursor) {
        parts.push({ type: 'text', value: content.slice(cursor, ref.index) })
      }
      parts.push({ type: 'ref', ref })
      cursor = ref.index + ref.raw.length
    }

    // Remaining text after last reference
    if (cursor < content.length) {
      parts.push({ type: 'text', value: content.slice(cursor) })
    }

    return parts
  }, [content])

  if (!segments.length) return null

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.value}</span>
        }
        // Scripture chip — inline, tappable
        return (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); onRefTap?.(seg.ref) }}
            className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-full align-middle active:scale-95 transition-all"
            style={{
              background:   '#EDE9FF',
              color:        '#5B4FCF',
              fontSize:     '0.8em',
              fontWeight:   700,
              lineHeight:   '1.6',
              verticalAlign:'middle',
              whiteSpace:   'nowrap',
            }}
          >
            <BookOpen size={11} style={{ flexShrink: 0 }} />
            {seg.ref.display}
          </button>
        )
      })}
    </span>
  )
}