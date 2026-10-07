import { Ago } from "@/components/Ago";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Segments, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { fill, t } from "@/lib/t";

export const metadata = { title: "المحلات" };

type ShopRow = { id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; paused: boolean; created_at: string; paid: boolean; shut: boolean; trial_hours: number; test?: boolean; owner: { name: string; phone: string | null }; customers: number; stamps: number; today: number; last_at: string | null };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));

/** The shop's year at a glance: paid, in its trial (and how long is left), or stopped at the trial's end. */
function PlanPill({ paid, shut, hours, test }: { paid: boolean; shut: boolean; hours: number; test?: boolean }) {
  if (test) return null;
  if (paid) return <Pill tone="mint">{t.aPlanPaid}</Pill>;
  if (shut) return <Pill tone="coral">{t.aTrialOver}</Pill>;
  return <Pill tone="brand">{hours >= 24 ? fill(t.aTrialDays, { n: Math.floor(hours / 24) }) : fill(t.aTrialHours, { n: hours })}</Pill>;
}

/** Every shop, one row each, with the numbers that say whether it is alive. */
export default async function AdminShops({ searchParams }: { searchParams: Promise<{ q?: string; tests?: string }> }) {
  const { q = "", tests } = await searchParams;
  // the real shops, or the test ones (the founder's own and the ones marked): never in one list
  const onTests = tests === "1";
  const [shops, other] = await Promise.all([
    call<ShopRow[]>("admin_shops", { p_q: q || null, p_tests: onTests }).then((r) => r ?? []),
    call<ShopRow[]>("admin_shops", { p_q: null, p_tests: !onTests }).then((r) => r ?? []),
  ]);
  const live = shops.filter((s) => !s.paused).length;
  const noCard = shops.filter((s) => !s.goal).length;
  const quiet = shops.filter((s) => !s.today).length;

  return (
    <Page
      title={t.aShops}
      hint={onTests ? t.aTestsHint : "كل محل والأرقام متاعو"}
      actions={
        <>
          <Segments
            now={onTests ? "tests" : "real"}
            items={[
              { id: "real", label: `${t.aReal} · ${onTests ? other.length : shops.length}`, href: "/admin/shops" },
              { id: "tests", label: `${t.aTests} · ${onTests ? shops.length : other.length}`, href: "/admin/shops?tests=1" },
            ]}
          />
          <Find action="/admin/shops" value={q} placeholder={t.aSearch} hidden={onTests ? { tests: "1" } : undefined} />
        </>
      }
    >
      <Stats cols={4}>
        <Stat label={t.aShops} value={shops.length} sub={q ? "من اللّوجان" : "في الكل"} />
        <Stat label="يخدمو" value={live} sub={shops.length - live ? `${shops.length - live} موقّفين` : t.aAllLive} tone="mint" />
        <Stat label="ما عملوش الكارط" value={noCard} sub={noCard ? "ما ينجمو ياخذو حتى تامبون" : "الكل عملو الكارط"} tone={noCard ? "coral" : "ink"} />
        <Stat label="بلا تامبون اليوم" value={quiet} sub={`من ${shops.length}`} />
      </Stats>

      <Card className="mt-4" pad={false}>
        {shops.length === 0 ? (
          <Empty>{t.aNothing}</Empty>
        ) : (
          <Table head={["المحل", t.aOwner, t.aCustomers, t.aToday, t.aStamps, t.aLast, t.aCreated]} words={[1]}>
            {shops.map((s) => (
              <Row key={s.id} href={`/admin/shops/${s.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.625rem]" style={{ background: s.color }}>
                      <ShopMark shop={s} size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <b className="truncate font-semibold text-ink">{s.name}</b>
                        {s.paused && <Pill tone="coral">{t.aPaused}</Pill>}
                        {!s.goal && <Pill>{t.aNoCard}</Pill>}
                        <PlanPill paid={s.paid} shut={s.shut} hours={s.trial_hours} test={s.test} />
                      </span>
                      <span className="block truncate text-[0.75rem] text-muted">{t.kinds[s.kind as keyof typeof t.kinds] ?? s.kind}</span>
                    </span>
                  </span>
                </Cell>
                <Cell muted className="whitespace-nowrap">
                  <span className="block truncate">{s.owner.name || t.aOwner}</span>
                  {s.owner.phone && (
                    <span className="block text-[0.75rem]">
                      <Num>{pretty(s.owner.phone)}</Num>
                    </span>
                  )}
                </Cell>
                <Cell n strong>
                  {s.customers}
                </Cell>
                <Cell n>{s.today}</Cell>
                <Cell n>{s.stamps}</Cell>
                <Cell n muted>
                  {s.last_at ? <Ago at={s.last_at} /> : "—"}
                </Cell>
                <Cell n muted>
                  <Ago at={s.created_at} className="block" />
                  <span className="block text-[0.6875rem]">{day(s.created_at)}</span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}
