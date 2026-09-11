/** The Pointidi mark: a map pin carrying a stamp dot. */
export function LogoMark({ size = 32, color = "#4536F0", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M24 3C14.6 3 7 10.4 7 19.6 7 31.6 21.2 43.3 22.6 44.5a2.2 2.2 0 0 0 2.8 0C26.8 43.3 41 31.6 41 19.6 41 10.4 33.4 3 24 3Z" fill={color} />
      <circle cx="24" cy="19.5" r="9.5" fill="#fff" />
      <path d="M20.3 15.2h4.6a4.4 4.4 0 0 1 0 8.8h-2.2v3.2h-2.4v-12Zm2.4 2.2v4.4h2.1a2.2 2.2 0 0 0 0-4.4h-2.1Z" fill={color} />
    </svg>
  );
}

export function Logo({ size = 30, light = false, className = "" }: { size?: number; light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoMark size={size} color={light ? "#8279F9" : "#4536F0"} />
      <span className={`font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`} style={{ fontSize: size * 0.8 }}>
        Pointidi
      </span>
    </span>
  );
}
