// ── src/app/community/[slug]/manage/page.js ──
// Server component — awaits params (Next.js 16 requirement),
// then passes slug to the client component below.

import { Suspense } from 'react'
import CommunityManageClient from './CommunityManageClient'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: 'Manage Community — Daily Walk',
    description: `Manage your Daily Walk community`,
  }
}

export default async function CommunityManagePage({ params }) {
  // Next.js 16: params is a Promise — must await before accessing properties
  const { slug } = await params

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#5B4FCF' }} />
      </div>
    }>
      <CommunityManageClient slug={slug} />
    </Suspense>
  )
}