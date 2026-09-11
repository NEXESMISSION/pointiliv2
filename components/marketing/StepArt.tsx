/**
 * Illustrations of the Pointili loop, one per step. Flat, calm, on-brand SVG:
 * crisp on every screen and a few KB each.
 */
const V = "#6535E0";
const V2 = "#9A76F7";
const V3 = "#D7C8FF";
const BG = "#F5F1FF";
const INK = "#111322";

function Qr({ x, y, s }: { x: number; y: number; s: number }) {
  // A believable QR: three finder squares + a deterministic module pattern.
  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const finder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      if (!finder && (r * 7 + c * 5 + r * c) % 3 === 0) cells.push([r, c]);
    }
  const m = s / 9;
  const finder = (fx: number, fy: number) => (
    <g>
      <rect x={fx} y={fy} width={m * 3} height={m * 3} rx={m * 0.5} fill={INK} />
      <rect x={fx + m * 0.6} y={fy + m * 0.6} width={m * 1.8} height={m * 1.8} rx={m * 0.3} fill="#fff" />
      <rect x={fx + m} y={fy + m} width={m} height={m} rx={m * 0.2} fill={INK} />
    </g>
  );
  return (
    <g>
      {finder(x, y)}
      {finder(x + m * 6, y)}
      {finder(x, y + m * 6)}
      {cells.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={x + c * m + m * 0.1} y={y + r * m + m * 0.1} width={m * 0.8} height={m * 0.8} rx={m * 0.2} fill={INK} />
      ))}
    </g>
  );
}

function Sparkle({ x, y, r, fill = V2 }: { x: number; y: number; r: number; fill?: string }) {
  return <path d={`M${x} ${y - r}C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} ${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} ${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} ${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`} fill={fill} />;
}

/** 1 · The QR stands on the counter. */
function ShowQr() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="A phone on a stand at the counter shows the Pointili QR code">
      <rect width="320" height="220" fill={BG} />
      <circle cx="160" cy="104" r="78" fill="#fff" opacity="0.7" />
      <rect x="30" y="176" width="260" height="10" rx="5" fill={V3} />
      <path d="M140 176l8-22h24l8 22z" fill={V2} />
      <rect x="112" y="34" width="96" height="128" rx="16" fill={INK} />
      <rect x="119" y="41" width="82" height="114" rx="11" fill="#fff" />
      <rect x="148" y="47" width="24" height="4" rx="2" fill={V3} />
      <Qr x={133} y={66} s={54} />
      <rect x="134" y="130" width="52" height="14" rx="7" fill={V} />
      <text x="160" y="140.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="sans-serif">+1 STAMP</text>
      <g transform="translate(222 124)">
        <path d="M4 18h40v6c0 18-9 28-20 28S4 42 4 24z" fill="#fff" stroke={V3} strokeWidth="2" />
        <path d="M44 26c10 0 10 14-2 15" stroke={V3} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="24" cy="18" rx="20" ry="4.5" fill="#6B4226" />
        <path d="M16 6c-3-3 2-5 0-9M26 6c-3-3 2-5 0-9" stroke={V2} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
      <Sparkle x={70} y={70} r={9} />
      <Sparkle x={252} y={62} r={6} fill={V3} />
    </svg>
  );
}

/** 2 · The customer points their phone at it. */
function Scan() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="A customer's phone scans the QR code">
      <rect width="320" height="220" fill={BG} />
      <circle cx="160" cy="110" r="80" fill="#fff" opacity="0.7" />
      <rect x="38" y="58" width="92" height="104" rx="16" fill="#fff" stroke={V3} strokeWidth="2" />
      <Qr x={56} y={76} s={56} />
      <path d="M130 110h26" stroke={V2} strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" />
      <g transform="rotate(-8 222 110)">
        <rect x="168" y="30" width="104" height="164" rx="20" fill={INK} />
        <rect x="176" y="38" width="88" height="148" rx="14" fill="#1F2233" />
        <g stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M194 80v-12h12M246 68h12v12M258 136v12h-12M206 148h-12v-12" />
        </g>
        <rect x="194" y="106" width="64" height="3" rx="1.5" fill={V2} />
        <circle cx="220" cy="172" r="7" fill="#fff" opacity="0.9" />
      </g>
      <path d="M268 190c-10-6-20-4-30 2l-10 18h50z" fill="#F2C9A0" />
      <Sparkle x={272} y={46} r={8} />
    </svg>
  );
}

/** 3 · A stamp lands on their card. */
function Stamp() {
  const dots = Array.from({ length: 10 }, (_, i) => i < 6);
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="The loyalty card on the phone gets a new stamp">
      <rect width="320" height="220" fill={BG} />
      <circle cx="160" cy="110" r="84" fill="#fff" opacity="0.7" />
      <rect x="96" y="20" width="128" height="190" rx="22" fill={INK} />
      <rect x="104" y="28" width="112" height="174" rx="16" fill="#fff" />
      <rect x="114" y="46" width="92" height="96" rx="14" fill={V} />
      <circle cx="130" cy="62" r="8" fill="#fff" opacity="0.25" />
      <rect x="143" y="57" width="44" height="5" rx="2.5" fill="#fff" />
      <rect x="143" y="66" width="28" height="4" rx="2" fill="#fff" opacity="0.6" />
      {dots.map((on, i) => {
        const cx = 126 + (i % 5) * 17;
        const cy = 94 + Math.floor(i / 5) * 18;
        return on ? <circle key={i} cx={cx} cy={cy} r="6.5" fill="#fff" /> : <circle key={i} cx={cx} cy={cy} r="5.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="2.5 2" />;
      })}
      <circle cx="211" cy="94" r="0" />
      <rect x="114" y="152" width="92" height="12" rx="6" fill={V3} />
      <rect x="114" y="170" width="60" height="8" rx="4" fill="#EBECF1" />
      <g transform="translate(206 62)">
        <rect width="70" height="32" rx="16" fill="#22C55E" />
        <text x="35" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="sans-serif">+1 ✓</text>
      </g>
      <Sparkle x={62} y={60} r={10} />
      <Sparkle x={270} y={160} r={7} fill={V3} />
    </svg>
  );
}

/** 4 · A full card comes back as a reward. */
function Reward() {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="The customer gets a free coffee reward">
      <rect width="320" height="220" fill={BG} />
      <circle cx="160" cy="112" r="84" fill="#fff" opacity="0.7" />
      <g transform="translate(92 70)">
        <rect x="0" y="36" width="84" height="74" rx="10" fill={V} />
        <rect x="-6" y="22" width="96" height="22" rx="8" fill={V2} />
        <rect x="36" y="22" width="12" height="88" fill={V3} />
        <path d="M42 22c-14-24-38-10-20 0M42 22c14-24 38-10 20 0" stroke={V3} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(196 92)">
        <path d="M4 18h44v7c0 20-10 32-22 32S4 45 4 25z" fill="#fff" stroke={V3} strokeWidth="2" />
        <path d="M48 27c11 0 11 16-2 17" stroke={V3} strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="26" cy="18" rx="22" ry="5" fill="#6B4226" />
      </g>
      <rect x="112" y="186" width="96" height="20" rx="10" fill="#fff" stroke={V3} />
      <text x="160" y="200" textAnchor="middle" fontSize="10" fontWeight="700" fill={V} fontFamily="sans-serif">Reward ready</text>
      <g fill={V2}>
        <rect x="70" y="52" width="8" height="4" rx="2" transform="rotate(30 74 54)" />
        <rect x="246" y="60" width="8" height="4" rx="2" transform="rotate(-25 250 62)" fill="#F5C451" />
        <rect x="258" y="150" width="8" height="4" rx="2" transform="rotate(40 262 152)" />
        <circle cx="60" cy="150" r="3" fill="#22C55E" />
        <circle cx="236" cy="40" r="2.5" />
      </g>
      <Sparkle x={232} y={80} r={9} fill="#F5C451" />
    </svg>
  );
}

const ART = [ShowQr, Scan, Stamp, Reward];

export function StepArt({ step, className = "" }: { step: number; className?: string }) {
  const Art = ART[step] ?? ShowQr;
  return (
    <div className={`[&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${className}`}>
      <Art />
    </div>
  );
}
