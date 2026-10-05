import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { AdminPersonActions } from "@/components/AdminPersonActions";
import { ShopMark } from "@/components/ShopMark";
import { Icon3D } from "@/components/ui";
import { Card, Cell, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "كونت" };

type Person = {
  id: string; name: string; phone: string | null; admin: boolean; tester: boolean; created_at: string;
  shop: { id: string; name: string; kind: string; color: string; logo: string | null } | null;
  cards: { shop: string; kind: string; color: string; stamps: number; goal: number | null; gifts: number; last_at: string | null }[];
};

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const short = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));

/** One account: who they are on the side, the cards they hold in the middle. */
export default async function AdminPerson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await call<Person | null>("admin_person", { p_id: id });
  if (!p) notFound();
  const gifts = p.cards.reduce((n, c) => n + c.gifts, 0);
  const stamps = p.cards.reduce((n, c) => n + c.stamps, 0);

  return (
    <Page
      title={p.name || t.someone}
      hint={`${t.aCreated} ${day(p.created_at)}`}
      actions={
        <Link href="/admin/people" className="inline-flex h-9 items-center gap-1 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
          <ChevronRight className="size-4" /> {t.aPeople}
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[1.25rem] font-bold text-white">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <b className="truncate text-[1.0625rem] text-ink">{p.name || t.someone}</b>
                  {p.admin && <Pill tone="ink">{t.aAdminBadge}</Pill>}
                  {p.tester && <Pill>{t.aTestBadge}</Pill>}
                </p>
                <p className="text-[0.8125rem] text-muted">{p.phone ? <Num>{pretty(p.phone)}</Num> : "بلا نومرو"}</p>
              </div>
            </div>
            {p.phone && (
              <a href={`tel:+216${digits(p.phone)}`} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-brand-soft px-3.5 text-[0.8438rem] font-bold text-brand hover:bg-brand hover:text-white">
                <Phone className="size-4" /> {t.aCall}
              </a>
            )}
          </Card>

          {p.shop && (
            <Card title={t.aShopOf}>
              <Link href={`/admin/shops/${p.shop.id}`} className="group flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem]" style={{ background: p.shop.color }}>
                  <ShopMark shop={p.shop} size={28} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-ink group-hover:text-brand">{p.shop.name}</span>
                <ChevronLeft className="size-4 shrink-0 text-faint" />
              </Link>
            </Card>
          )}

          {p.admin ? <p className="rounded-[1rem] border border-line bg-canvas px-4 py-3 text-center text-[0.875rem] font-medium text-muted">{t.aIsAdmin}</p> : <AdminPersonActions id={p.id} name={p.name} phone={p.phone} tester={p.tester} />}
        </div>

        <div className="min-w-0 space-y-4">
          <Stats cols={3}>
            <Stat label={t.aCards} value={p.cards.length} />
            <Stat label={t.aStamps} value={stamps} tone="brand" />
            <Stat label={t.aGiven} value={gifts} tone="coral" />
          </Stats>

          <Card title={t.aCardsOf} pad={false}>
            {p.cards.length === 0 ? (
              <Empty>{t.aNoCardsOf}</Empty>
            ) : (
              <Table head={["المحل", "كادو", "تامبون", t.aLast]}>
                {p.cards.map((c, i) => (
                  <Row key={i}>
                    <Cell strong>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-[0.625rem]" style={{ background: c.color }}>
                          <Icon3D name={kindIcon(c.kind)} size={22} />
                        </span>
                        <span className="truncate">{c.shop}</span>
                      </span>
                    </Cell>
                    <Cell n>{c.gifts > 0 ? <span className="font-bold text-coral">{c.gifts}</span> : "—"}</Cell>
                    <Cell n strong>
                      {Math.min(c.stamps, c.goal ?? c.stamps)}/{c.goal ?? "–"}
                    </Cell>
                    <Cell n muted>
                      {c.last_at ? short(c.last_at) : "—"}
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
