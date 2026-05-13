// ── /plan/[slug] — Shareable plan preview ──

import PlanPreviewClient from './PlanPreviewClient'

export async function generateMetadata({ params, searchParams }) {
  const name = searchParams.name || 'A Bible Reading Plan'
  const desc = searchParams.desc || 'A personal Bible study plan on Daily Walk'
  const days = searchParams.days || '30'

  return {
    title:       `${name} — Daily Walk`,
    description: `${days}-day Bible reading plan: ${desc}`,
    openGraph: {
      title:       `${name} — Daily Walk`,
      description: `${days}-day plan · ${desc}`,
      url:         `https://dailywalk.app/plan/${params.slug}`,
      siteName:    'Daily Walk',
      images: [{
        url:    `https://dailywalk.app/og/plan?name=${encodeURIComponent(name)}&days=${days}`,
        width:  1200,
        height: 630,
        alt:    `${name} on Daily Walk`,
      }],
    },
    twitter: { card:'summary_large_image', title:`${name} — Daily Walk`, description: `${days}-day plan` },
  }
}

export default function PlanPreviewPage({ params, searchParams }) {
  return (
    <PlanPreviewClient
      slug={params.slug}
      name={searchParams.name || 'Reading Plan'}
      desc={searchParams.desc || ''}
      days={searchParams.days || '30'}
      type={searchParams.type || 'topic'}
    />
  )
}