// ── src/app/plans/[id]/page.js ──
// Server component — awaits params, passes planId to client

import { Suspense } from 'react'
import PlanDetailClient from './PlanDetailClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  return { title: 'Reading Plan — Daily Walk' }
}

export default async function PlanDetailPage({ params }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background:'#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }}/>
      </div>
    }>
      <PlanDetailClient planId={id}/>
    </Suspense>
  )
}