// ── BibleIcon — Realistic leather-bound Bible SVG ──
// Design: warm burgundy leather, gold cross, ribbon bookmark, page edges.
// Works on any background — uses its own warm colours, not currentColor.
// Used in: BottomNav centre (size 30), home Open Bible card (size 24),
//          plans daily reading header (size 20).

export function BibleIcon({ size = 24, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Page edges — cream layered effect on right side */}
      <rect x="22" y="4" width="2"   height="24" rx="0.5" fill="#F5F0E8" opacity="0.9"/>
      <rect x="23" y="4" width="2"   height="24" rx="0.5" fill="#EDE8DC" opacity="0.7"/>
      <rect x="24" y="4" width="1.5" height="24" rx="0.5" fill="#E5E0D4" opacity="0.5"/>

      {/* Main Bible cover — deep burgundy leather */}
      <rect x="4" y="3" width="20" height="26" rx="2" fill="#5C2D1E"/>

      {/* Leather gradient overlay — top-left light source */}
      <rect x="4" y="3" width="20" height="26" rx="2" fill="url(#lg)" opacity="0.4"/>

      {/* Spine — darker left edge */}
      <rect x="4" y="3" width="3.5" height="26" rx="2" fill="#3D1A0E"/>
      <rect x="6" y="3" width="1.5" height="26"        fill="#3D1A0E"/>

      {/* Spine decorative lines */}
      <line x1="5" y1="10" x2="7.5" y2="10" stroke="#8B4513" strokeWidth="0.5" opacity="0.6"/>
      <line x1="5" y1="22" x2="7.5" y2="22" stroke="#8B4513" strokeWidth="0.5" opacity="0.6"/>

      {/* Gold cross — vertical bar */}
      <rect x="14.5" y="10" width="2"   height="11" rx="1" fill="#D4A843"/>
      {/* Gold cross — horizontal bar */}
      <rect x="11"   y="13.5" width="9" height="2"  rx="1" fill="#D4A843"/>
      {/* Cross inner shine */}
      <rect x="15" y="10.5" width="0.8" height="3" rx="0.4" fill="#F0C060" opacity="0.7"/>

      {/* Gold border frame on cover */}
      <rect x="8" y="5.5" width="13" height="21" rx="1"
            fill="none" stroke="#D4A843" strokeWidth="0.6" opacity="0.5"/>

      {/* Ribbon bookmark — deep red */}
      <path d="M18 3 L18 11 L16.5 9.5 L15 11 L15 3" fill="#8B1A1A" opacity="0.9"/>
      <path d="M17 3 L17 10"   stroke="#C02020" strokeWidth="0.4" opacity="0.5"/>

      {/* Bottom page line detail */}
      <line x1="8" y1="27" x2="21" y2="27" stroke="#D4A843" strokeWidth="0.5" opacity="0.3"/>

      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.15"/>
          <stop offset="50%"  stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="black" stopOpacity="0.15"/>
        </linearGradient>
      </defs>
    </svg>
  )
}