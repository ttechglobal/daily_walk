// ── /post/[slug] — Shareable post preview page ──
// Server component so metadata (OG tags) render at SSR time.
// When shared on WhatsApp/Twitter the OG image + title previews immediately.
// The page itself shows post content + "Open in Daily Walk" CTA.

import { notFound } from 'next/navigation'
import PostPreviewClient from './PostPreviewClient'

function findPost(slug, allPosts) {
  // slug is last 8 chars of post id
  return allPosts.find(p => p.id.slice(-8) === slug || p.id === slug) || null
}

// OG metadata — reads from URL params since we don't have a DB on server
export async function generateMetadata({ params, searchParams }) {
  const { slug } = params
  // Title + description passed as query params from share URL builder
  const title   = searchParams.title   || 'A post on Daily Walk'
  const content = searchParams.content || 'Shared from the Daily Walk app'
  const author  = searchParams.author  || 'Someone'

  return {
    title:       `${author} on Daily Walk`,
    description: content.slice(0, 200),
    openGraph: {
      title:       `${author} on Daily Walk`,
      description: content.slice(0, 200),
      url:         `https://dailywalk.app/post/${slug}`,
      siteName:    'Daily Walk',
      type:        'article',
      images: [
        {
          url:    `https://dailywalk.app/og/post?content=${encodeURIComponent(content.slice(0,120))}&author=${encodeURIComponent(author)}`,
          width:  1200,
          height: 630,
          alt:    `${author} on Daily Walk`,
        }
      ],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${author} on Daily Walk`,
      description: content.slice(0, 200),
    },
  }
}

export default function PostPreviewPage({ params, searchParams }) {
  const { slug }   = params
  const content    = searchParams.content || ''
  const author     = searchParams.author  || 'Someone'
  const passage    = searchParams.passage || ''
  const type       = searchParams.type    || 'general'

  // PostPreviewClient handles the interactive UI
  return (
    <PostPreviewClient
      slug={slug}
      content={content}
      author={author}
      passage={passage}
      type={type}
    />
  )
}