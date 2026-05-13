// ── /community/[slug] — Shareable community preview ──

import CommunityPreviewClient from './CommunityPreviewClient'

export async function generateMetadata({ params, searchParams }) {
  const name    = searchParams.name    || 'A Daily Walk Community'
  const desc    = searchParams.desc    || 'Join this community on Daily Walk'
  const members = searchParams.members || '0'

  return {
    title:       `${name} — Daily Walk`,
    description: desc,
    openGraph: {
      title:       `Join ${name} on Daily Walk`,
      description: `${members} members · ${desc}`,
      url:         `https://dailywalk.app/community/${params.slug}`,
      siteName:    'Daily Walk',
      type:        'website',
      images: [{
        url:    `https://dailywalk.app/og/community?name=${encodeURIComponent(name)}&members=${members}`,
        width:  1200,
        height: 630,
        alt:    `${name} on Daily Walk`,
      }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `Join ${name} on Daily Walk`,
      description: desc,
    },
  }
}

export default function CommunityPreviewPage({ params, searchParams }) {
  return (
    <CommunityPreviewClient
      slug={params.slug}
      name={searchParams.name || 'Community'}
      desc={searchParams.desc || ''}
      members={searchParams.members || '0'}
      category={searchParams.category || 'General'}
      inviteCode={searchParams.code || ''}
    />
  )
}