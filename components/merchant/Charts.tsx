/** Small, dependency-free SVG charts (server-rendered). */

export function BarChart({ data, color = "#6535E0", height = 140, label }: { data: { label: string; value: number }[]; color?: string; height?: number; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const gap = n > 40 ? 1 : 3;
  const w = 100 / n;
  const ticks = [data[0], data[Math.floor((n - 1) / 2)], data[n - 1]].filter(Boolean) as { label: string }[];
  return (
    <figure>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block h-20 w-full sm:h-36" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2="100" y1={height * t} y2={height * t} stroke="#E8EAF2" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4);
          return <rect key={i} x={i * w + gap * 0.05} y={height - h} width={Math.max(0.4, w - gap * 0.1)} height={h} rx="0.6" fill={color} opacity={d.value ? 1 : 0.15} />;
        })}
      </svg>
      <figcaption dir="ltr" className="mt-1 flex justify-between text-xs text-muted">
        {ticks.map((t, i) => (
          // two charts share a phone row, so only the ends of the axis fit there
          <span key={i} className={i === 1 ? "hidden sm:inline" : ""}>
            {t.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function Donut({ a, b, aLabel, bLabel, aColor = "#6535E0", bColor = "#B9A1FC" }: { a: number; b: number; aLabel: string; bLabel: string; aColor?: string; bColor?: string }) {
  const total = a + b;
  const pa = total ? a / total : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-5">
      <svg viewBox="0 0 100 100" className="size-16 shrink-0 -rotate-90 sm:size-28" role="img" aria-label={`${aLabel} ${a}, ${bLabel} ${b}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={total ? bColor : "#E8EAF2"} strokeWidth="14" />
        {total > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={aColor} strokeWidth="14" strokeDasharray={`${pa * circ} ${circ}`} />}
      </svg>
      <ul className="space-y-1.5 text-xs sm:text-sm">
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: aColor }} />
          <b className="text-ink tabular">{total ? Math.round(pa * 100) : 0}%</b> <span className="text-muted">{aLabel} ({a})</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: bColor }} />
          <b className="text-ink tabular">{total ? 100 - Math.round(pa * 100) : 0}%</b> <span className="text-muted">{bLabel} ({b})</span>
        </li>
      </ul>
    </div>
  );
}
