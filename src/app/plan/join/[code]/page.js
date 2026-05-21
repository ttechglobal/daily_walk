// ── src/app/plan/join/[code]/page.js ──
import { Suspense } from 'react'
import JoinPlanClient from './JoinPlanClient'

export async function generateMetadata({ params }) {
  const { code } = await params
  return { title: 'Join Reading Plan — Daily Walk' }
}

export default async function JoinPlanPage({ params }) {
  const { code } = await params
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{background:'#FAF8F5'}}><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#5B4FCF'}}/></div>}>
      <JoinPlanClient code={code}/>
    </Suspense>
  )
}