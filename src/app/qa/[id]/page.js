// ── src/app/qa/[id]/page.js ──
// Question detail — server component wraps params, client component renders

import { Suspense } from 'react'
import QuestionDetailClient from './QuestionDetailClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  return { title: 'Question — Daily Walk', description: 'A question from the Daily Walk community' }
}

export default async function QuestionDetailPage({ params }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{background:'#FAF8F5'}}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'#5B4FCF'}}/>
      </div>
    }>
      <QuestionDetailClient questionId={id}/>
    </Suspense>
  )
}