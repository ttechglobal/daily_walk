'use client'

// ── src/components/communities/CommunitySkeleton.js ──
export default function CommunitySkeleton({ t }) {
  return (
    <div className="rounded-[18px] px-4 py-3.5 flex items-center gap-3 animate-pulse min-h-[64px]"
      style={{ background: t.bgCard, boxShadow: t.shadow }}>
      <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ background: t.bgMuted }}/>
      <div className="flex-1">
        <div className="h-3.5 rounded-full mb-2 w-1/2" style={{ background: t.bgMuted }}/>
        <div className="h-2.5 rounded-full w-1/3" style={{ background: t.bgMuted }}/>
      </div>
    </div>
  )
}