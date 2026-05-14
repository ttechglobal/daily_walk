// ── /plan/[slug] — Plan share landing page ──
// OG meta from query params. Shows plan name, description, 3-day preview, CTA.

export async function generateMetadata({ params, searchParams: sp }) {
  const name = sp.name || 'A Bible Reading Plan'
  const desc = sp.desc || 'A personal Bible study plan on Daily Walk'
  const days = sp.days || '30'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalkapp.vercel.app'

  return {
    title: `${name} — Daily Walk`,
    description: `${days}-day plan: ${desc}`,
    openGraph: {
      title:       `${name} — Daily Walk`,
      description: `${days}-day Bible reading plan · ${desc}`,
      url:         `${appUrl}/plan/${params.slug}`,
      siteName:    'Daily Walk',
      images: [{ url:`${appUrl}/og-image.png`, width:1200, height:630 }],
    },
    twitter: { card:'summary_large_image', title:`${name} — Daily Walk`, description: desc },
  }
}

import PlanLandingClient from './PlanLandingClient'
export default function PlanPage({ params, searchParams: sp }) {
  return <PlanLandingClient slug={params.slug} sp={sp} />
}