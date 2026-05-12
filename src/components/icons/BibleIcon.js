// ── BibleIcon — Custom SVG Bible icon for Daily Walk ──
// Replaces Lucide BookOpen wherever the Bible reader is referenced.
// Looks like a real Bible: hardcover with cross and bookmark ribbon.
//
// Usage:
//   import { BibleIcon } from '../components/icons/BibleIcon'
//   <BibleIcon size={28} color="white" />

export function BibleIcon({ size = 24, color = 'currentColor', className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bible spine — left edge, slightly darker */}
      <rect x="3" y="2" width="3" height="20" rx="1.5" fill={color} opacity="0.6" />

      {/* Bible cover — main body */}
      <rect x="5" y="2" width="14" height="20" rx="2" fill={color} opacity="0.9" />

      {/* Cover highlight — subtle 3D effect */}
      <rect x="5" y="2" width="14" height="20" rx="2" fill="white" opacity="0.08" />

      {/* Cross — vertical bar */}
      <rect x="11.5" y="7" width="1.5" height="8" rx="0.75" fill="white" opacity="0.95" />

      {/* Cross — horizontal bar */}
      <rect x="8.5" y="9.5" width="7" height="1.5" rx="0.75" fill="white" opacity="0.95" />

      {/* Bookmark ribbon */}
      <path d="M16 2 L16 8 L14.5 6.5 L13 8 L13 2" fill="white" opacity="0.7" />

      {/* Bottom page lines */}
      <line x1="7" y1="19"   x2="17" y2="19"   stroke="white" strokeWidth="0.5" opacity="0.4" />
      <line x1="7" y1="17.5" x2="15" y2="17.5" stroke="white" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}