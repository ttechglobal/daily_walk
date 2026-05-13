// ── lib/link-preview.js ──
// Fetch Open Graph / meta data for URLs pasted in posts.
// Uses microlink.io (free, CORS-friendly). Falls back gracefully.

export async function fetchLinkPreview(url) {
  try {
    const res  = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(4000)
    })
    const data = await res.json()
    if (data.status !== 'success') return null
    return {
      url,
      title:       data.data.title       || '',
      description: data.data.description || '',
      image:       data.data.image?.url  || null,
      domain:      new URL(url).hostname.replace('www.', ''),
    }
  } catch { return null }
}

// Extract first URL from text
export function extractUrl(text) {
  const match = text.match(/(https?:\/\/[^\s]+)/)
  return match ? match[0] : null
}