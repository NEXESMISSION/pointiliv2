/** Small, dependency-free SVG charts (server-rendered). */

export function BarChart({ data, color = "#4536F0", height = 140, label }: { data: { label: string; value: number }[]; color?: string; height?: number; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const gap = n > 40 ? 1 : 3;
  const w = 100 / n;
  const ticks = [data[0], data[Math.floor((n - 1) / 2)], data[n - 1]].filter(Boolean) as { label: string }[];
  return (
    <figure>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block h-36 w-full" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2="100" y1={height * t} y2={height * t} stroke="#E8EAF2" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4);
          return <rect key={i} x={i * w + gap * 0.05} y={height - h} width={Math.max(0.4, w - gap * 0.1)} height={h} rx="0.6" fill={color} opacity={d.value ? 1 : 0.15} />;
        })}
      </svg>
      <figcaption className="mt-1.5 flex justify-between text-[11px] text-muted">
        {ticks.map((t, i) => (
          <span key={i}>{t.label}</span>
        ))}
      </figcaption>
    </figure>
  );
}

export function Donut({ a, b, aLabel, bLabel, aColor = "#4536F0", bColor = "#A7A2FD" }: { a: number; b: number; aLabel: string; bLabel: string; aColor?: string; bColor?: string }) {
  const total = a + b;
  const pa = total ? a / total : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label={`${aLabel} ${a}, ${bLabel} ${b}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={total ? bColor : "#E8EAF2"} strokeWidth="14" />
        {total > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={aColor} strokeWidth="14" strokeDasharray={`${pa * circ} ${circ}`} />}
      </svg>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: aColor }} />
          <b className="text-ink tabular">{total ? Math.round(pa * 100) : 0}%</b> <span className="text-muted">{aLabel} ({a})</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: bColor }} />
          <b className="text-ink tabular">{total ? 100 - Math.round(pa * 100) : 0}%</b> <span className="text-muted">{bLabel} ({b})</span>
        </li>
      </ul>
    </div>
  );
}
