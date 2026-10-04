import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { t } from "@/lib/t";

export const metadata = { title: "المحلات" };

type ShopRow = { id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; paused: boolean; created_at: string; owner: { name: string; phone: string | null }; customers: number; stamps: number; today: number; last_at: string | null };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));

/** Every shop, one row each, with the numbers that say whether it is alive. */
export default async function AdminShops({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const shops = (await call<ShopRow[]>("admin_shops", { p_q: q || null })) ?? [];
  const live = shops.filter((s) => !s.paused).length;
  const noCard = shops.filter((s) => !s.goal).length;
  const quiet = shops.filter((s) => !s.today).length;

  return (
    <Page title={t.aShops} hint="كل محل والأرقام متاعو" actions={<Find action="/admin/shops" value={q} placeholder={t.aSearch} />}>
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
                  {s.last_at ? day(s.last_at) : "—"}
                </Cell>
                <Cell n muted>
                  {day(s.created_at)}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}
