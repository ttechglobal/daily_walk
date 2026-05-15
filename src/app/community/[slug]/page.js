// ── /community/[slug] — Community page by slug ──

import { Suspense } from 'react'
import CommunityBySlug from './CommunityBySlug'

export async function generateMetadata({ params }) {
  // Next.js 16: params is a Promise — must await
  const { slug } = await params
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalkapp.vercel.app'
  return {
    title:       `Community — Daily Walk`,
    description: 'A community on Daily Walk',
    openGraph: {
      title:    'Community on Daily Walk',
      url:      `${appUrl}/community/${slug}`,
      siteName: 'Daily Walk',
    },
  }
}

export default async function CommunitySlugPage({ params }) {
  // Next.js 16: params is a Promise — must await
  const { slug } = await params
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen" style={{ background:'#FAF8F5' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'#5B4FCF' }} />
      </div>
    }>
      <CommunityBySlug slug={slug} />
    </Suspense>
  )
}