import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

/**
 * The console's kit — the founder's desk, not a phone.
 *
 * Three rules it keeps everywhere, because breaking them is what made the old
 * admin hard to read:
 *   1. One idea per box. A box has a title, and what is under it answers that
 *      title. Numbers live in tiles, lists live in tables, never mixed.
 *   2. Latin never floats in Arabic. A phone, a date, a route, a browser name
 *      goes through <Num> or <Lat>, which isolate it, so nothing flips.
 *   3. Tables align: words start-aligned, numbers end-aligned and tabular, so
 *      a column reads down as a column.
 */

/* ── the two isolates ───────────────────────────────────────────────── */

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

/* ── page frame ─────────────────────────────────────────────────────── */

/** A console page: its name, one line of help, its buttons, then the work. */
export function Page({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.625rem] font-bold leading-tight text-ink">{title}</h1>
          {hint && <p className="mt-1 text-[0.875rem] text-muted">{hint}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </>
  );
}

/** One box, one idea. `fill`: the box is as tall as its neighbour in a row, and what is under the title takes all of it. */
export function Card({ title, hint, actions, children, className = "", pad = true, fill = false }: { title?: string; hint?: string; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean; fill?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-[1rem] border border-line bg-surface ${fill ? "flex flex-col" : ""} ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="min-w-0 truncate text-[0.9375rem] font-bold text-ink">
            {title}
            {hint && <span className="ms-2 text-[0.8125rem] font-medium text-muted">{hint}</span>}
          </h2>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`${pad ? "p-4" : ""} ${fill ? "min-h-0 flex-1" : ""}`}>{children}</div>
    </section>
  );
}

/** A number that matters, with its name under it. */
export function Stat({ label, value, sub, tone = "ink" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ink" | "brand" | "coral" | "mint" }) {
  const color = { ink: "text-ink", brand: "text-brand", coral: "text-coral", mint: "text-mint" }[tone];
  return (
    <div className="rounded-[1rem] border border-line bg-surface px-4 py-3">
      <p className="truncate text-[0.8125rem] font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-[1.75rem] font-bold leading-none ${color}`}>
        {/* a count, a share, or a length of time — bdi reads which it is */}
        <bdi className="tabular-nums">{value}</bdi>
      </p>
      {sub != null && <p className="mt-1.5 truncate text-[0.75rem] text-faint">{sub}</p>}
    </div>
  );
}

/** A row of tiles that reflows: four across on a wide screen, two on a small one. */
export const Stats = ({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 | 6 }) => (
  <div className={`grid gap-3 ${{ 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4", 5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5", 6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" }[cols]}`}>{children}</div>
);

/* ── tables ─────────────────────────────────────────────────────────── */

/**
 * Every list in the console is this table: a head that stays, rows that light up.
 * A head sits over its column the way the column reads: the first one and the
 * `words` columns at the start, the numbers at the end.
 */
export function Table({ head, words = [], children, className = "" }: { head: ReactNode[]; words?: number[]; children: ReactNode; className?: string }) {
  return (
    // a wide table scrolls sideways inside its own box, never the page
    <div data-list className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-[0.875rem]">
        <thead>
          <tr className="border-b border-line">
            {head.map((h, i) => (
              <th key={i} className={`whitespace-nowrap px-4 py-2.5 text-[0.75rem] font-bold text-muted ${i === 0 || words.includes(i) ? "text-start" : "text-end"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

type CellProps = { children: ReactNode; n?: boolean; strong?: boolean; muted?: boolean; className?: string; href?: string; lead?: boolean };

/**
 * A row that opens something: the whole row is the link's hit area. An <a>
 * cannot wrap <td>s, and a cell of its own for the link would push every
 * column one step off its head — so each cell carries the link over itself.
 */
export function Row({ children, href }: { children: ReactNode; href?: string }) {
  if (!href) return <tr className="transition-colors hover:bg-canvas/70">{children}</tr>;
  const cells = Children.toArray(children);
  const first = cells.findIndex((c) => isValidElement(c) && c.type === Cell);
  return (
    <tr className="group cursor-pointer transition-colors hover:bg-canvas/70">
      {cells.map((c, i) => (isValidElement<CellProps>(c) && c.type === Cell ? cloneElement(c, { href, lead: i === first }) : c))}
    </tr>
  );
}

/** A cell: words by default, `n` for a number (end-aligned, tabular). In a row that opens something, it carries the row's link. */
export function Cell({ children, n, strong, muted, className = "", href, lead }: CellProps) {
  return (
    <td className={`px-4 py-2.5 ${href ? "relative" : ""} ${n ? "whitespace-nowrap text-end" : "text-start"} ${strong ? "font-semibold text-ink" : muted ? "text-muted" : "text-body"} ${className}`}>
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
  grey: "bg-canvas text-muted",
  ink: "bg-ink text-white",
} as const;

export const Pill = ({ children, tone = "grey" }: { children: ReactNode; tone?: keyof typeof tones }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${tones[tone]}`}>{children}</span>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="px-4 py-10 text-center text-[0.9375rem] text-muted">{children}</p>;

/** A ranked list: the bar shows the share, the number sits at the end. */
export function Bars({ rows, tone = "brand" }: { rows: { key: string; label: ReactNode; sub?: ReactNode; n: number }[]; tone?: "brand" | "coral" }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const bar = tone === "coral" ? "bg-coral/70" : "bg-brand/70";
  if (!rows.length) return <Empty>ما فمّا شي</Empty>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[0.875rem] font-medium text-ink">{r.label}</span>
            <span className="shrink-0 text-[0.8125rem] font-bold text-body">
              <Num>{r.n}</Num>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
          {r.sub != null && <p className="mt-1 truncate text-[0.75rem] text-faint">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ── buttons and inputs, console-sized ──────────────────────────────── */

const btn = {
  main: "bg-brand text-white hover:bg-brand-deep",
  soft: "border border-line bg-surface text-body hover:border-brand hover:text-brand",
  coral: "bg-coral-soft text-coral hover:bg-coral hover:text-white",
} as const;
const btnBase = "inline-flex h-9 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.625rem] px-3.5 text-[0.8438rem] font-semibold transition-colors disabled:opacity-50";

export const CBtn = ({ kind = "soft", className = "", ...rest }: React.ComponentProps<"button"> & { kind?: keyof typeof btn }) => (
  <button className={`${btnBase} ${btn[kind]} ${className}`} {...rest} />
);

export const CLink = ({ kind = "soft", className = "", href, children, title }: { kind?: keyof typeof btn; className?: string; href: string; children: ReactNode; title?: string }) => (
  <Link href={href} title={title} className={`${btnBase} ${btn[kind]} ${className}`}>
    {children}
  </Link>
);

/** A switch made of links: the range of days, the two sides of a list. */
export function Segments({ items, now }: { items: { id: string; label: string; href: string }[]; now: string }) {
  return (
    <div className="inline-flex rounded-[0.75rem] border border-line bg-surface p-1">
      {items.map((x) => (
        <Link key={x.id} href={x.href} className={`inline-flex h-7 items-center justify-center rounded-[0.5rem] px-3 text-[0.8125rem] font-semibold transition-colors ${now === x.id ? "bg-brand text-white" : "text-muted hover:text-ink"}`}>
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
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        // on a touch screen 16px, or the phone zooms in on it — and the box sized by its own text, so the words in it still fit
        className="h-9 w-[clamp(12rem,22vw,20rem)] rounded-[0.625rem] border border-line bg-surface px-3.5 text-[0.875rem] text-ink outline-none placeholder:text-faint focus:border-brand pointer-coarse:h-[2.25em] pointer-coarse:w-[12.5em] pointer-coarse:text-[16px]"
      />
    </form>
  );
}
