'use client'

// ── src/app/communities/[id]/page.js ──
// This old route is superseded by /community/[slug]/page.js
// Redirect any hit here to the correct URL.

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function OldCommunityRoute() {
  const { id }   = useParams()
  const router   = useRouter()

  useEffect(() => {
    if (id) {
      // Forward to the canonical community route — CommunityBySlug handles both UUIDs and slugs
      router.replace(`/community/${id}`)
    } else {
      router.replace('/communities')
    }
  }, [id]) // eslint-disable-line

  return null
}