const COLORS = ["#6535E0", "#22C55E", "#F59E0B", "#EC4899", "#0EA5E9", "#9A76F7"];

/** A one-shot burst of confetti. CSS only (transform/opacity), respects reduced motion via globals.css. */
export function Confetti({ count = 36 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <style>{`@keyframes pd-confetti{0%{transform:translate3d(0,-10vh,0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translate3d(var(--dx),75vh,0) rotate(var(--r));opacity:0}}`}</style>
      {Array.from({ length: count }, (_, i) => {
        // deterministic pseudo-random so server and client render the same
        const r = (n: number) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1;
        return (
          <span
            key={i}
            className="absolute top-0 block rounded-[2px]"
            style={
              {
                left: `${r(1) * 100}%`,
                width: 6 + r(2) * 6,
                height: 8 + r(3) * 8,
                background: COLORS[i % COLORS.length],
                "--dx": `${(r(4) - 0.5) * 120}px`,
                "--r": `${r(5) * 720 - 360}deg`,
                animation: `pd-confetti ${1.8 + r(6) * 1.4}s cubic-bezier(.2,.6,.4,1) ${r(7) * 0.5}s both`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
