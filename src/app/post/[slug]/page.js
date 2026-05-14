// ── /post/[slug] — Post share landing page ──
// Server component generates OG meta from query params.
// Client shows post content + community + "Join Daily Walk" CTA.

import { APP_URL } from '../../../lib/config'

export async function generateMetadata({ params, searchParams: sp }) {
  const author    = sp.author  || 'Someone'
  const content   = sp.content || 'Shared from Daily Walk'
  const community = sp.community || ''
  const desc = community
    ? `Posted in ${community} · ${content.slice(0, 140)}`
    : content.slice(0, 160)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dailywalkapp.vercel.app'

  return {
    title: `${author} on Daily Walk`,
    description: desc,
    openGraph: {
      title:       `${author} on Daily Walk`,
      description: desc,
      url:         `${appUrl}/post/${params.slug}`,
      siteName:    'Daily Walk',
      type:        'article',
      images: [{ url:`${appUrl}/og-image.png`, width:1200, height:630, alt:'Daily Walk' }],
    },
    twitter: { card:'summary', title:`${author} on Daily Walk`, description: desc },
  }
}

export default function PostPage({ params, searchParams: sp }) {
  return <PostLanding slug={params.slug} sp={sp} />
}

// ── Inline client component ──
import PostLandingClient from './PostLandingClient'
function PostLanding({ slug, sp }) {
  return <PostLandingClient slug={slug} sp={sp} />
}