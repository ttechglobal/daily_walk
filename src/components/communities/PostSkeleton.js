'use client'

// ── src/components/communities/PostSkeleton.js ──
export default function PostSkeleton({ t }) {
  return (
    <div className="rounded-[20px] p-4 animate-pulse" style={{ background: t.bgCard, boxShadow: t.shadow }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: t.bgMuted }}/>
        <div className="flex-1">
          <div className="h-3 rounded-full mb-1.5 w-1/3" style={{ background: t.bgMuted }}/>
          <div className="h-2.5 rounded-full w-1/4" style={{ background: t.bgMuted }}/>
        </div>
      </div>
      <div className="h-3 rounded-full mb-2" style={{ background: t.bgMuted }}/>
      <div className="h-3 rounded-full mb-2 w-4/5" style={{ background: t.bgMuted }}/>
      <div className="h-3 rounded-full w-3/5 mb-4" style={{ background: t.bgMuted }}/>
      <div className="flex gap-4 pt-2 border-t" style={{ borderColor: t.border }}>
        <div className="h-5 rounded-full w-12" style={{ background: t.bgMuted }}/>
        <div className="h-5 rounded-full w-12" style={{ background: t.bgMuted }}/>
      </div>
    </div>
  )
}