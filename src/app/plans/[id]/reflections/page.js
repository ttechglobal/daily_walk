// ── src/app/plans/[id]/reflections/page.js ──
import { Suspense } from 'react'
import ReflectionsClient from './ReflectionsClient'

export async function generateMetadata({ params }) {
  await params
  return { title: 'Daily Reflections — Daily Walk' }
}

export default async function ReflectionsPage({ params }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background:'#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }}/>
      </div>
    }>
      <ReflectionsClient planId={id}/>
    </Suspense>
  )
}