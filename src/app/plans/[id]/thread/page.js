// ── src/app/plans/[id]/thread/page.js ──
import { Suspense } from 'react'
import ThreadClient from './ThreadClient'

export async function generateMetadata({ params }) {
  await params
  return { title: 'Group Thread — Daily Walk' }
}

export default async function ThreadPage({ params }) {
  const { id } = await params
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen" style={{background:'#FAF8F5'}}><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#5B4FCF'}}/></div>}>
      <ThreadClient planId={id}/>
    </Suspense>
  )
}