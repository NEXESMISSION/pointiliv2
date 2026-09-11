/**
 * The Pointili mark: two stacked loyalty cards, the front one carrying a sparkle.
 * Vector redraw of brand-mark.webp (96×70). The gap between the cards is a mask,
 * so the mark sits cleanly on any background.
 */
export function LogoMark({ size = 32, tone = "color", className = "" }: { size?: number; tone?: "color" | "white"; className?: string }) {
  const white = tone === "white";
  const id = white ? "ptl-w" : "ptl-c";
  return (
    <svg width={size} height={Math.round((size * 70) / 96)} viewBox="0 0 96 70" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-back`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#7244EC" />
          <stop offset="1" stopColor="#4F28C6" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#7143E6" />
          <stop offset="1" stopColor="#5029C5" />
        </linearGradient>
        <mask id={`${id}-gap`}>
          <rect width="96" height="70" fill="#fff" />
          <rect x="-2" y="14" width="86" height="58" rx="10" fill="#000" />
        </mask>
      </defs>
      <rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill={white ? "#FFFFFF" : `url(#${id}-back)`} fillOpacity={white ? 0.55 : 1} mask={`url(#${id}-gap)`} />
      <rect x="1" y="17" width="80" height="52" rx="8" fill={white ? "#FFFFFF" : `url(#${id}-front)`} />
      <path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill={white ? "#6535E0" : "#FFFFFF"} />
    </svg>
  );
}

export function Logo({ size = 30, light = false, className = "" }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={Math.round(size * 1.15)} />
      <span className={`font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`} style={{ fontSize: size * 0.78 }}>
        Pointili
      </span>
    </span>
  );
}
