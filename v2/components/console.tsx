import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { counted } from "@/lib/t";

/**
 * The console's kit — the founder's desk, not a phone.
 *
 * Remade on 18 Oct 2026 (the founder: «much much better and cleaner»): one
 * calm surface — white boxes on the soft grey, a hairline and the faintest
 * shadow, generous room inside — and purple only where something can be done
 * or is chosen. Coral is a gift or a problem, green is paid or done.
 *
 * Three rules it keeps everywhere:
 *   1. One idea per box. A box has a title, and what is under it answers that
 *      title. Numbers live in tiles, lists live in tables, never mixed.
 *   2. Latin never floats in Arabic. A phone, a date, a route, a browser name
 *      goes through <Num> or <Lat>, which isolate it, so nothing flips.
 *   3. Tables align: words start-aligned, numbers end-aligned and tabular, so
 *      a column reads down as a column.
 */

/* ── the isolates ───────────────────────────────────────────────────── */

/** Digits, dates, phones: left to right, tabular, and sealed off from the Arabic around them. */
export const Num = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <bdi className={`num ${className}`}>{children}</bdi>
);

/**
 * A mixed string whose direction is whatever it starts with: «/shop/card ·
 * الكارط» then reads left to right, «الكارط · خذا تامبون» right to left.
 * For anything built by joining a name to a route or a step.
 */
export const Bidi = ({ children, className = "" }: { children: ReactNode; className?: string }) => <bdi className={className}>{children}</bdi>;

/**
 * A date, a time, a length: digits with Arabic words in them («4 أكتوبر»,
 * «1د 40ث»). Isolated like a number, but NOT forced left to right — that is
 * what turns «4 أكتوبر 2026» into «أكتوبر 2026 4».
 */
export const When = ({ children, className = "" }: { children: ReactNode; className?: string }) => <bdi className={`tabular-nums ${className}`}>{children}</bdi>;

/** Latin words — a route, a link, a browser — sealed the same way, but not tabular. */
export const Lat = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <bdi dir="ltr" className={`lat ${className}`}>
    {children}
  </bdi>
);

/* ── words for lengths and times ─────────────────────────────────────── */

/** times, the Tunisian way: مرّة, زوز مرّات, 5 مرّات, 12 مرّة */
export const timesN = (n: number) => counted(n, "مرّة", "زوز مرّات", "مرّات", "مرّة");
/**
 * How long, in words: «45 ثانية», «زوز دقايق», «25 دقيقة», «ساعة و10 دقايق».
 * Never «25د»: a «د» after a number is the dinar everywhere else in Pointili.
 */
export function howLong(ms: number): string {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return counted(Math.max(1, s), "ثانية", "زوز ثواني", "ثواني", "ثانية");
  const m = Math.round(s / 60);
  if (m < 60) return counted(m, "دقيقة", "زوز دقايق", "دقايق", "دقيقة");
  const h = Math.floor(m / 60);
  const r = m % 60;
  const hours = counted(h, "ساعة", "زوز سوايع", "سوايع", "ساعة");
  return r ? `${hours} و${counted(r, "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}` : hours;
}

/* ── page frame ─────────────────────────────────────────────────────── */

/** the one look of a box: white, a hairline, the faintest shadow */
export const box = "rounded-[1.25rem] border border-line/80 bg-surface shadow-[0_1px_2px_rgb(15_14_23/0.04)]";

/** A console page: its name, one line saying what it is for, its buttons, then the work. */
export function Page({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-bold leading-tight text-ink">{title}</h1>
          {hint && <p className="mt-1 text-[0.9375rem] text-muted">{hint}</p>}
        </div>
        {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </>
  );
}

/**
 * One box, one idea: a title (and its one quiet line under it), then what
 * answers it. `pad={false}` for a table, which brings its own room.
 * `fill`: as tall as its neighbour in a row, what is under the title taking all of it.
 */
export function Card({ title, hint, actions, children, className = "", pad = true, fill = false }: { title?: string; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean; fill?: boolean }) {
  const head = !!(title || actions);
  return (
    <section className={`overflow-hidden ${box} ${fill ? "flex flex-col" : ""} ${className}`}>
      {head && (
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[1rem] font-bold text-ink">{title}</h2>}
            {hint != null && hint !== "" && <p className="mt-0.5 text-[0.8125rem] text-muted">{hint}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`${pad ? (head ? "px-5 pb-5" : "p-5") : ""} ${fill ? "min-h-0 flex-1" : ""}`}>{children}</div>
    </section>
  );
}

const statTone = {
  ink: { value: "text-ink", mark: "bg-canvas text-body" },
  brand: { value: "text-brand", mark: "bg-brand-soft text-brand" },
  coral: { value: "text-coral", mark: "bg-coral-soft text-coral" },
  mint: { value: "text-mint", mark: "bg-mint-soft text-mint" },
} as const;

/** A number that matters: its name (with its icon), the number large, one quiet line under it. */
export function Stat({ label, value, sub, tone = "ink", icon: Icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof statTone; icon?: LucideIcon }) {
  const c = statTone[tone];
  return (
    <div className={`${box} px-4 py-3.5`}>
      <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-semibold text-muted">
        {Icon && (
          <span className={`grid size-7 shrink-0 place-items-center rounded-[0.625rem] ${c.mark}`}>
            <Icon className="size-4" strokeWidth={2.2} />
          </span>
        )}
        <span className="truncate">{label}</span>
      </p>
      <p className={`mt-2.5 text-[1.875rem] font-bold leading-none ${c.value}`}>
        {/* a count, a share, or a length of time — bdi reads which it is */}
        <bdi className="tabular-nums">{value}</bdi>
      </p>
      {sub != null && <p className="mt-2 truncate text-[0.75rem] text-muted">{sub}</p>}
    </div>
  );
}

/** A row of tiles that reflows: four across on a wide screen, two on a small one. */
export const Stats = ({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6 }) => (
  <div className={`grid gap-3 ${{ 2: "grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4", 5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5", 6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" }[cols]}`}>{children}</div>
);

/** A side box's lines: what it is on the start side, how it stands on the end side (and a quiet line under). */
export function Facts({ rows }: { rows: ({ label: ReactNode; value: ReactNode; sub?: ReactNode } | null | false)[] }) {
  return (
    <dl className="divide-y divide-line/70 text-[0.875rem]">
      {rows.filter(Boolean).map((r, i) => {
        const x = r as { label: ReactNode; value: ReactNode; sub?: ReactNode };
        return (
          <div key={i} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="shrink-0 text-muted">{x.label}</dt>
            <dd className="min-w-0 text-end font-semibold text-ink">
              {x.value}
              {x.sub != null && <span className="mt-0.5 block text-[0.75rem] font-normal text-muted">{x.sub}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ── tables ─────────────────────────────────────────────────────────── */

/**
 * Every list in the console is this table: a tinted head that stays, rows that light up.
 * A head sits over its column the way the column reads: the first one and the
 * `words` columns at the start, the numbers at the end.
 *
 * On a phone (under 768px) the same table turns into a stack of cards, one a
 * row: the first cell is the card's title, every other cell a line «its head …
 * its value» — the head's word travels down to each cell as `data-label`, and
 * globals.css draws it. Nothing spills sideways, nothing is cut.
 */
export function Table({ head, words = [], children, className = "" }: { head: ReactNode[]; words?: number[]; children: ReactNode; className?: string }) {
  const labels = head.map((h, i) => (i > 0 && typeof h === "string" && h.trim() ? h : undefined));
  return (
    // a wide table scrolls sideways inside its own box, never the page
    <div data-list className={`overflow-x-auto ${className}`}>
      <table className="ctable w-full border-collapse text-[0.875rem]">
        <thead>
          <tr className="border-y border-line/80 bg-canvas/70">
            {head.map((h, i) => (
              <th key={i} className={`whitespace-nowrap px-5 py-2.5 text-[0.75rem] font-semibold text-muted ${i === 0 || words.includes(i) ? "text-start" : "text-end"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{Children.map(children, (row) => (isValidElement<RowProps>(row) && row.type === Row ? cloneElement(row, { labels }) : row))}</tbody>
      </table>
    </div>
  );
}

type CellProps = { children: ReactNode; n?: boolean; strong?: boolean; muted?: boolean; className?: string; href?: string; lead?: boolean; label?: string };
type RowProps = { children: ReactNode; href?: string; labels?: (string | undefined)[] };

/**
 * A row that opens something: the whole row is the link's hit area. An <a>
 * cannot wrap <td>s, and a cell of its own for the link would push every
 * column one step off its head — so each cell carries the link over itself.
 */
export function Row({ children, href, labels }: RowProps) {
  const cells = Children.toArray(children);
  const first = cells.findIndex((c) => isValidElement(c) && c.type === Cell);
  // each cell learns its head's word (for the phone) and, in a row that opens something, the row's link
  return (
    <tr className={`transition-colors hover:bg-brand-soft/35 ${href ? "group cursor-pointer" : ""}`}>
      {cells.map((c, i) => (isValidElement<CellProps>(c) && c.type === Cell ? cloneElement(c, { label: labels?.[i], ...(href ? { href, lead: i === first } : {}) }) : c))}
    </tr>
  );
}

/** A cell: words by default, `n` for a number (end-aligned, tabular). In a row that opens something, it carries the row's link. */
export function Cell({ children, n, strong, muted, className = "", href, lead, label }: CellProps) {
  return (
    <td data-label={label} className={`px-5 py-3 ${href ? "relative" : ""} ${n ? "whitespace-nowrap text-end" : "text-start"} ${strong ? "font-semibold text-ink" : muted ? "text-muted" : "text-body"} ${className}`}>
      {/* the row's link, over the whole cell: one stop for the keyboard, on the row's first cell */}
      {href && <Link href={href} className="absolute inset-0 z-[1]" aria-label=" " tabIndex={lead ? undefined : -1} aria-hidden={lead ? undefined : true} prefetch={lead ? undefined : false} />}
      {/* auto direction: a count reads the same either way, a date does not */}
      {n ? <bdi className="tabular-nums">{children}</bdi> : children}
    </td>
  );
}

/* ── small parts ────────────────────────────────────────────────────── */

const tones = {
  brand: "bg-brand-soft text-brand",
  coral: "bg-coral-soft text-coral",
  mint: "bg-mint-soft text-mint",
  grey: "bg-canvas text-muted ring-1 ring-inset ring-line/80",
  ink: "bg-ink text-white",
} as const;

export const Pill = ({ children, tone = "grey" }: { children: ReactNode; tone?: keyof typeof tones }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${tones[tone]}`}>{children}</span>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="px-5 py-12 text-center text-[0.9375rem] text-muted">{children}</p>;

/** A ranked list: the bar shows the share, the number sits at the end. */
export function Bars({ rows, tone = "brand" }: { rows: { key: string; label: ReactNode; sub?: ReactNode; n: number }[]; tone?: "brand" | "coral" }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const bar = tone === "coral" ? "bg-coral/70" : "bg-brand/70";
  if (!rows.length) return <Empty>ما فمّا شي</Empty>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[0.875rem] font-medium text-ink">{r.label}</span>
            <span className="shrink-0 text-[0.8125rem] font-bold text-body">
              <Num>{r.n}</Num>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
          {r.sub != null && <p className="mt-1 truncate text-[0.75rem] text-muted">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ── buttons and inputs, console-sized ──────────────────────────────── */

const btn = {
  main: "bg-brand text-white shadow-[0_1px_2px_rgb(74_42_214/0.3)] hover:bg-brand-deep",
  soft: "border border-line bg-surface text-body hover:border-brand/50 hover:text-brand",
  ghost: "text-brand hover:bg-brand-soft",
  coral: "bg-coral-soft text-coral hover:bg-coral hover:text-white",
} as const;
const btnBase = "inline-flex h-9 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.75rem] px-3.5 text-[0.875rem] font-semibold transition-colors disabled:opacity-50";

export const CBtn = ({ kind = "soft", className = "", ...rest }: React.ComponentProps<"button"> & { kind?: keyof typeof btn }) => (
  <button className={`${btnBase} ${btn[kind]} ${className}`} {...rest} />
);

export const CLink = ({ kind = "soft", className = "", href, children, title }: { kind?: keyof typeof btn; className?: string; href: string; children: ReactNode; title?: string }) => (
  <Link href={href} title={title} className={`${btnBase} ${btn[kind]} ${className}`}>
    {children}
  </Link>
);

/** A file to save, like the books as a spreadsheet: a plain link, never prefetched. */
export const CFile = ({ kind = "soft", className = "", href, children }: { kind?: keyof typeof btn; className?: string; href: string; children: ReactNode }) => (
  <a href={href} download className={`${btnBase} ${btn[kind]} ${className}`}>
    {children}
  </a>
);

/** A switch made of links: the range of days, the two sides of a list. The chosen one lifts out of its track. */
export function Segments({ items, now }: { items: { id: string; label: string; href: string }[]; now: string }) {
  return (
    <div className="inline-flex rounded-[0.875rem] border border-line/80 bg-canvas p-1">
      {items.map((x) => (
        <Link
          key={x.id}
          href={x.href}
          className={`inline-flex h-7 items-center justify-center rounded-[0.625rem] px-3 text-[0.8125rem] font-semibold transition-colors ${now === x.id ? "bg-surface text-ink shadow-[0_1px_3px_rgb(15_14_23/0.12)]" : "text-muted hover:text-ink"}`}
        >
          {x.label}
        </Link>
      ))}
    </div>
  );
}

/** The console's search box: one per page, in the page header. */
export function Find({ action, name = "q", value, placeholder, hidden }: { action: string; name?: string; value?: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} className="relative">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        // on a touch screen 16px, or the phone zooms in on it — and the box sized by its own text, so the words in it still fit
        className="h-9 w-[clamp(12rem,22vw,20rem)] rounded-[0.75rem] border border-line bg-surface pe-3.5 ps-9 text-[0.875rem] text-ink outline-none placeholder:text-faint focus:border-brand pointer-coarse:h-[2.25em] pointer-coarse:w-[12.5em] pointer-coarse:text-[16px]"
      />
    </form>
  );
}
