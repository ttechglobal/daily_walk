// ── AppIcon — Daily Walk brand icon ──
// Praying hands on open Bible with flame rising from the pages.
// Used in: install prompt, about page, onboarding welcome.
// For PNG icons use the generate-icons script.

export function AppIcon({ size = 120, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="ai_bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7C6FCD"/>
          <stop offset="100%" stopColor="#4535A8"/>
        </linearGradient>
        <linearGradient id="ai_flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#E8A838"/>
          <stop offset="50%"  stopColor="#F5C842"/>
          <stop offset="100%" stopColor="#FFF0A0"/>
        </linearGradient>
        <linearGradient id="ai_flameGlow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#E8A838" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#F5C842" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="ai_pageL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#E8E0D0"/>
          <stop offset="100%" stopColor="#F5F0E8"/>
        </linearGradient>
        <linearGradient id="ai_pageR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#F5F0E8"/>
          <stop offset="100%" stopColor="#E8E0D0"/>
        </linearGradient>
        <radialGradient id="ai_halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F5C842" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#F5C842" stopOpacity="0"/>
        </radialGradient>
        <clipPath id="ai_clip">
          <rect width="120" height="120" rx="26"/>
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="120" height="120" rx="26" fill="url(#ai_bg)"/>

      <g clipPath="url(#ai_clip)">
        {/* Glow halo */}
        <ellipse cx="60" cy="62" rx="28" ry="24" fill="url(#ai_halo)" opacity="0.6"/>

        {/* Open Bible left page */}
        <path d="M22 72 Q22 68 28 66 L60 63 L60 95 Q40 96 28 94 Q22 92 22 88 Z" fill="url(#ai_pageL)"/>
        {/* Open Bible right page */}
        <path d="M98 72 Q98 68 92 66 L60 63 L60 95 Q80 96 92 94 Q98 92 98 88 Z" fill="url(#ai_pageR)"/>
        {/* Spine */}
        <rect x="58.5" y="63" width="3" height="32" rx="1.5" fill="#C8B89A" opacity="0.7"/>
        {/* Page lines left */}
        <line x1="32" y1="75" x2="56" y2="74" stroke="#C8B89A" strokeWidth="0.8" opacity="0.5"/>
        <line x1="32" y1="80" x2="56" y2="79" stroke="#C8B89A" strokeWidth="0.8" opacity="0.4"/>
        <line x1="32" y1="85" x2="56" y2="84" stroke="#C8B89A" strokeWidth="0.8" opacity="0.3"/>
        {/* Page lines right */}
        <line x1="64" y1="74" x2="88" y2="75" stroke="#C8B89A" strokeWidth="0.8" opacity="0.5"/>
        <line x1="64" y1="79" x2="88" y2="80" stroke="#C8B89A" strokeWidth="0.8" opacity="0.4"/>
        <line x1="64" y1="84" x2="88" y2="85" stroke="#C8B89A" strokeWidth="0.8" opacity="0.3"/>
        {/* Cover bottom edge */}
        <path d="M20 88 Q20 96 28 97 L92 97 Q100 96 100 88 L100 90 Q100 100 92 101 L28 101 Q20 100 20 90 Z"
              fill="#3D1A0E" opacity="0.6"/>

        {/* Left praying hand */}
        <path d="M60 88 C58 86 50 78 46 70 C44 65 44 60 46 57 C47 54 49 53 51 54
                 C51 50 53 48 55 49 C55 46 57 44 59 46 C59 43 61 42 63 44
                 L63 65 C61 65 60 66 60 68 Z"
              fill="#F4C28A"/>
        <path d="M60 88 C58 86 50 78 46 70 C44 65 44 60 46 57 C47 54 49 53 51 54
                 L51 56 C50 58 50 63 52 68 C54 74 58 81 60 85 Z"
              fill="#E8A870" opacity="0.5"/>
        {/* Right praying hand */}
        <path d="M60 88 C62 86 70 78 74 70 C76 65 76 60 74 57 C73 54 71 53 69 54
                 C69 50 67 48 65 49 C65 46 63 44 61 46 C61 43 59 42 57 44
                 L57 65 C59 65 60 66 60 68 Z"
              fill="#F4C28A"/>
        <path d="M60 88 C62 86 70 78 74 70 C76 65 76 60 74 57 C73 54 71 53 69 54
                 L69 56 C70 58 70 63 68 68 C66 74 62 81 60 85 Z"
              fill="#E8A870" opacity="0.5"/>
        <ellipse cx="60" cy="76" rx="3" ry="8" fill="#E8A870" opacity="0.4"/>

        {/* Flame glow behind */}
        <ellipse cx="60" cy="52" rx="12" ry="16" fill="url(#ai_flameGlow)" opacity="0.8"/>

        {/* Main flame */}
        <path d="M60 24 C60 24 52 34 50 42 C48 48 50 54 54 56
                 C54 52 56 50 58 50 C56 46 56 40 60 34
                 C64 40 64 46 62 50 C64 50 66 52 66 56
                 C70 54 72 48 70 42 C68 34 60 24 60 24 Z"
              fill="url(#ai_flame)"/>
        {/* Inner highlight */}
        <path d="M60 32 C60 32 56 39 55 44 C54 48 56 52 58 53
                 C58 50 59 48 60 46 C61 48 62 50 62 53
                 C64 52 66 48 65 44 C64 39 60 32 60 32 Z"
              fill="#FFF5C0" opacity="0.7"/>
        {/* Tip */}
        <path d="M60 24 C59 28 58 30 58 33 C59 31 60 29 60 27
                 C60 29 61 31 62 33 C62 30 61 28 60 24 Z"
              fill="white" opacity="0.6"/>
      </g>
    </svg>
  )
}