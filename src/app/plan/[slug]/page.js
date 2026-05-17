// ── /plan/[slug] — Plan share landing page ──
// Slug format: {plan-name}-{8-char-id}
// Next.js 16: params is a Promise — must await in both generateMetadata and page component.

export async function generateMetadata({ params }) {
  const { slug } = await params
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalkapp.vercel.app'

  const parts   = (slug || '').split('-')
  const shortId = parts[parts.length - 1]
  const name    = parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Bible Reading Plan'

  return {
    title:       `${name} — Daily Walk`,
    description: `A Bible reading plan on Daily Walk. Click to start reading.`,
    openGraph: {
      title:       `${name} — Daily Walk`,
      description: 'A personal Bible reading plan. Join me on Daily Walk.',
      url:         `${appUrl}/plan/${slug}`,
      siteName:    'Daily Walk',
      images: [{
        url:    `${appUrl}/api/og/plan?slug=${encodeURIComponent(slug || '')}&name=${encodeURIComponent(name)}`,
        width:  1200,
        height: 630,
        alt:    `${name} — Daily Walk`,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${name} — Daily Walk`,
      description: 'A personal Bible reading plan.',
    },
  }
}

import PlanLandingClient from './PlanLandingClient'

export default async function PlanPage({ params }) {
  // Next.js 16: params is a Promise — must await
  const { slug } = await params
  return <PlanLandingClient slug={slug} />
}