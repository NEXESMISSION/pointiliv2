import { ClickMap } from "@/components/admin/traffic/ClickMap";
import { PagePicker, Pills, TogglePill } from "@/components/admin/traffic/Controls";
import { RankList } from "@/components/admin/traffic/RankList";
import { RANGES, clicksPageHref, isRange, pageName, rangeWindow, trafficHref, type Range, type TrafficClicks } from "@/components/admin/traffic/model";
import { TopBar } from "@/components/nav/TopBar";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.traffic.clicksTitle };
}

/**
 * Only the public pages can be shown in the frame: every other page needs an
 * account, and signed in as the founder it would show the console instead.
 */
const PREVIEWABLE = ["/", "/pricing", "/how-it-works", "/fr", "/fr/pricing", "/fr/how-it-works"];

/** "link /pricing «الأسوام»" → what it says, and what kind of thing it was. */
function target(raw: string): { main: string; sub: string | null } {
  const m = raw.match(/^(\S+)(?: ([^«]+?))?(?: «(.*)»)?$/);
  if (!m) return { main: raw, sub: null };
  const [, kind, where, label] = m;
  return { main: label || where || kind!, sub: label ? [kind, where].filter(Boolean).join(" ") : where ? kind! : null };
}

export default async function ClicksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "d7";
  const all = sp.all === "1";
  const device = sp.device === "desktop" ? "desktop" : "mobile";
  const path = typeof sp.path === "string" && sp.path.startsWith("/") ? sp.path.slice(0, 200) : "/";
  const { from, to } = rangeWindow(range);
  const c = await rpc<TrafficClicks>("admin_traffic_clicks", {
    p_path: path,
    p_device: device,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_all: all,
  });
  const { t, count } = await getI18n();
  const w = t.admin.traffic;

  const paths = [...new Set([path, ...c.pages.map((p) => p.k), ...PREVIEWABLE])];
  const tapsOn = new Map(c.pages.map((p) => [p.k, p.n]));
  const options = paths.map((p) => ({ value: p, label: `${pageName(w, p)}${tapsOn.get(p) ? ` (${tapsOn.get(p)})` : ""}` }));
  const hrefFor = Object.fromEntries(paths.map((p) => [p, clicksPageHref(p, device, range, all)]));
  const previewable = PREVIEWABLE.includes(path);

  const targets = (
    <RankList
      title={w.topTargets}
      empty={w.noClicks}
      rows={c.targets.slice(0, previewable ? 6 : 12).map((x) => {
        const it = target(x.k);
        return { key: x.k, label: <span dir="auto">{it.main}</span>, sub: it.sub ? <span dir="ltr">{it.sub}</span> : undefined, n: x.n };
      })}
    />
  );
  const total = <p className="text-center text-xs text-muted">{c.total ? count(w.clicks, c.total) : w.noClicks}</p>;
  const map = (
    <ClickMap
      key={`${path}-${device}`}
      src={path}
      points={c.points}
      title={pageName(w, path)}
      {...(device === "mobile" ? { width: 390, height: 844, maxHeight: 440, fit: "height" as const } : { width: 1280, height: 800, maxHeight: 330 })}
    />
  );

  return (
    <div className="animate-fade space-y-2.5">
      <TopBar back={trafficHref("pages", range, all)} title={w.clicksTitle} subtitle={w.clicksSubtitle} />
      <div className="flex items-center gap-2">
        <PagePicker value={path} options={options} hrefFor={hrefFor} label={w.topPages} />
        <Pills
          active={device}
          items={(["mobile", "desktop"] as const).map((d) => ({
            key: d,
            label: `${w.device[d]} ${c.by_device[d] ?? 0}`,
            href: clicksPageHref(path, d, range, all),
          }))}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Pills active={range} items={RANGES.map((r) => ({ key: r, label: w.ranges[r], href: clicksPageHref(path, device, r, all) }))} />
        <TogglePill on={all} href={clicksPageHref(path, device, range, !all)} label={w.withMine} hint={w.withMineHint} />
      </div>

      {!previewable ? (
        <>
          {c.total > 0 && <p className="rounded-2xl bg-white px-4 py-3 text-center text-sm text-muted ring-1 ring-inset ring-line">{w.noPreview}</p>}
          {targets}
        </>
      ) : device === "mobile" ? (
        // a phone stands beside its list…
        <div className="flex items-start gap-2">
          {map}
          <div className="min-w-0 flex-1 space-y-2">
            {targets}
            {total}
          </div>
        </div>
      ) : (
        // …a computer screen needs the whole width
        <>
          {map}
          {total}
          {targets}
        </>
      )}
    </div>
  );
}
