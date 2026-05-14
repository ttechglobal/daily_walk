// ── /plan/[slug] — Plan share landing page ──
// Slug format: {plan-name}-{8-char-id}
// OG meta generated server-side. Client reads preview from localStorage.

export async function generateMetadata({ params }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalkapp.vercel.app'
  // Extract a readable name from slug for OG title
  const parts = params.slug.split('-')
  const shortId = parts[parts.length - 1]
  const name = parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Bible Reading Plan'

  return {
    title: `${name} — Daily Walk`,
    description: `A Bible reading plan on Daily Walk. Click to start reading.`,
    openGraph: {
      title:       `${name} — Daily Walk`,
      description: 'A personal Bible reading plan. Join me on Daily Walk.',
      url:         `${appUrl}/plan/${params.slug}`,
      siteName:    'Daily Walk',
      images: [{
        url:    `${appUrl}/api/og/plan?slug=${encodeURIComponent(params.slug)}&name=${encodeURIComponent(name)}`,
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
export default function PlanPage({ params }) {
  return <PlanLandingClient slug={params.slug} />
}