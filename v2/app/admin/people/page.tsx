import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { t } from "@/lib/t";

export const metadata = { title: "الكونتات" };

type PersonRow = { id: string; name: string; phone: string | null; admin: boolean; created_at: string; shop: string | null; cards: number; stamps: number };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", year: "2-digit", timeZone: TZ }).format(new Date(iso));

/** Every account: the owners, the customers, and you. */
export default async function AdminPeople({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const people = (await call<PersonRow[]>("admin_people", { p_q: q || null })) ?? [];
  const owners = people.filter((p) => p.shop).length;
  const withCards = people.filter((p) => p.cards > 0).length;

  return (
    <Page title={t.aPeople} hint="كل واحد عندو كونت في Pointili" actions={<Find action="/admin/people" value={q} placeholder={t.aSearch} />}>
      <Stats cols={4}>
        <Stat label="كونتات" value={people.length} sub={q ? "من اللّوجان" : "في الكل"} />
        <Stat label="موالي محلات" value={owners} />
        <Stat label="عندهم كارط" value={withCards} sub={`من ${people.length}`} tone="brand" />
        <Stat label="كارطات" value={people.reduce((n, p) => n + p.cards, 0)} sub="في الكل" />
      </Stats>

      <Card className="mt-4" pad={false}>
        {people.length === 0 ? (
          <Empty>{t.aNothing}</Empty>
        ) : (
          <Table head={["الكونت", t.phone, t.aShopOf, t.aCards, t.aStamps, t.aCreated]} words={[2]}>
            {people.map((p) => (
              <Row key={p.id} href={`/admin/people/${p.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[0.875rem] font-bold text-white">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <b className="truncate font-semibold text-ink">{p.name || t.someone}</b>
                      {p.admin && <Pill tone="ink">{t.aAdminBadge}</Pill>}
                    </span>
                  </span>
                </Cell>
                <Cell n muted>
                  {p.phone ? <Num>{pretty(p.phone)}</Num> : "—"}
                </Cell>
                <Cell muted>
                  <span className="block truncate">{p.shop || "—"}</span>
                </Cell>
                <Cell n strong>
                  {p.cards}
                </Cell>
                <Cell n>{p.stamps}</Cell>
                <Cell n muted>
                  {day(p.created_at)}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}
