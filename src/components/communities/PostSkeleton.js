'use client'
// ── src/components/communities/PostSkeleton.js ──
// Matches the card shape using app's class system
export default function PostSkeleton({ t }) {  // t unused, kept for compat
  return (
    <div className="bg-white rounded-[20px] p-4 shadow-card animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0 bg-warm-outer"/>
        <div className="flex-1">
          <div className="h-3 rounded-full mb-1.5 w-1/3 bg-warm-outer"/>
          <div className="h-2.5 rounded-full w-1/4 bg-warm-outer"/>
        </div>
      </div>
      <div className="h-3 rounded-full mb-2 bg-warm-outer"/>
      <div className="h-3 rounded-full mb-2 w-4/5 bg-warm-outer"/>
      <div className="h-3 rounded-full w-3/5 mb-4 bg-warm-outer"/>
      <div className="flex gap-4 pt-2 border-t border-gray-100">
        <div className="h-5 rounded-full w-12 bg-warm-outer"/>
        <div className="h-5 rounded-full w-12 bg-warm-outer"/>
      </div>
    </div>
  )
}