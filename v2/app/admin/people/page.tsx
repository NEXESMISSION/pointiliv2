import Link from "next/link";
import { Store, Users, WalletCards, UserRound } from "lucide-react";
import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Segments, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { Presence, Reach } from "@/components/Presence";
import { t } from "@/lib/t";

export const metadata = { title: "الكونتات" };

type PersonRow = { id: string; name: string; phone: string | null; admin: boolean; tester?: boolean; created_at: string; shop: string | null; cards: number; stamps: number };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", year: "2-digit", timeZone: TZ }).format(new Date(iso));

/**
 * Every account: the owners, the customers, and you — the newest first, a
 * screenful at a time (the whole list at once was a page seventeen screens
 * long), the rest one tap away.
 */
export default async function AdminPeople({ searchParams }: { searchParams: Promise<{ q?: string; tests?: string; n?: string }> }) {
  const { q = "", tests, n } = await searchParams;
  // the real accounts, or the test ones (the founder's own and the ones marked): never in one list
  const onTests = tests === "1";
  const [people, other] = await Promise.all([
    call<PersonRow[]>("admin_people", { p_q: q || null, p_tests: onTests }).then((r) => r ?? []),
    call<PersonRow[]>("admin_people", { p_q: null, p_tests: !onTests }).then((r) => r ?? []),
  ]);
  const owners = people.filter((p) => p.shop).length;
  const withCards = people.filter((p) => p.cards > 0).length;
  const PAGE = 40;
  const want = Math.max(PAGE, Math.min(2000, Number(n) || PAGE));
  const rows = people.slice(0, want);
  const left = people.length - rows.length;
  const more = new URLSearchParams({ ...(onTests ? { tests: "1" } : {}), ...(q ? { q } : {}), n: String(want + PAGE) });

  return (
    <Page
      title="الكونتات"
      hint={onTests ? t.aTestsHint : "كل واحد عندو كونت في Pointili، الجدد لفوق"}
      actions={
        <>
          <Segments
            now={onTests ? "tests" : "real"}
            items={[
              { id: "real", label: `الحقيقيين · ${onTests ? other.length : people.length}`, href: "/admin/people" },
              { id: "tests", label: `التجربة · ${onTests ? people.length : other.length}`, href: "/admin/people?tests=1" },
            ]}
          />
          <Find action="/admin/people" value={q} placeholder="لوّج بالاسم ولا النومرو" hidden={onTests ? { tests: "1" } : undefined} />
        </>
      }
    >
      <Stats cols={4}>
        <Stat icon={Users} label="كونتات" value={people.length} sub={q ? "لقيتهم باللوّجان" : "في الكل"} />
        <Stat icon={Store} label="موالي محلات" value={owners} sub={`من ${people.length}`} />
        <Stat icon={UserRound} label="عندهم كارط" value={withCards} sub={`من ${people.length}`} tone="brand" />
        <Stat icon={WalletCards} label="كارطات" value={people.reduce((s, p) => s + p.cards, 0)} sub="في الكل" />
      </Stats>

      <Card className="mt-5" pad={false}>
        {people.length === 0 ? (
          <Empty>{q ? "ما لقينا حد بالاسم ولا النومرو هذا" : "مازال حتى كونت"}</Empty>
        ) : (
          <Table head={["الكونت", "التليفون", "المحل متاعو", "كارطات", "تامبونات", "عمل الكونت"]} words={[2]}>
            {rows.map((p) => (
              <Row key={p.id} href={`/admin/people/${p.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.875rem] font-bold text-brand">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <b className="truncate font-semibold text-ink">{p.name || t.someone}</b>
                        {p.admin && <Pill tone="ink">أدمين</Pill>}
                        {p.tester && <Pill>تجربة</Pill>}
                      </span>
                      <Presence user={p.id} />
                    </span>
                  </span>
                </Cell>
                <Cell n muted>
                  <span className="inline-flex items-center gap-2.5">
                    {p.phone ? <Num>{pretty(p.phone)}</Num> : "—"}
                    {!p.admin && <Reach phone={p.phone} />}
                  </span>
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
        {left > 0 && (
          <Link href={`/admin/people?${more}`} className="flex items-center justify-center gap-2 border-t border-line/80 py-3 text-[0.875rem] font-bold text-brand hover:bg-brand-soft/35">
            ورّي {Math.min(PAGE, left)} أخرين
            <span className="font-medium text-muted">مازال {left}</span>
          </Link>
        )}
      </Card>
    </Page>
  );
}
