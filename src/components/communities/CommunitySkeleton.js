'use client'
// ── src/components/communities/CommunitySkeleton.js ──
export default function CommunitySkeleton({ t }) {  // t unused, kept for compat
  return (
    <div className="bg-white rounded-[20px] px-4 py-3.5 flex items-center gap-3 shadow-card animate-pulse min-h-[64px]">
      <div className="w-12 h-12 rounded-2xl flex-shrink-0 bg-warm-outer"/>
      <div className="flex-1">
        <div className="h-3.5 rounded-full mb-2 w-1/2 bg-warm-outer"/>
        <div className="h-2.5 rounded-full w-1/3 bg-warm-outer"/>
      </div>
    </div>
  )
}