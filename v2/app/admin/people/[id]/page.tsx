import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Gift, MessageCircle, Phone, Stamp, WalletCards } from "lucide-react";
import { AdminPersonActions } from "@/components/AdminPersonActions";
import { ShopMark } from "@/components/ShopMark";
import { Icon3D } from "@/components/ui";
import { box, Card, Cell, CLink, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { Presence } from "@/components/Presence";
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

/** One account: who they are and how to reach them on top, the cards they hold under it, the founder's tools on the side. */
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
      hint={`عمل الكونت نهار ${day(p.created_at)}`}
      actions={
        <CLink href="/admin/people">
          <ChevronRight className="size-4" /> الكونتات
        </CLink>
      }
    >
      {/* who they are, and the two ways to reach them */}
      <section className={`${box} flex flex-wrap items-center gap-x-6 gap-y-4 p-5`}>
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-soft text-[1.5rem] font-bold text-brand">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <b className="truncate text-[1.25rem] text-ink">{p.name || t.someone}</b>
            {p.admin && <Pill tone="ink">أدمين</Pill>}
            {p.tester && <Pill>تجربة</Pill>}
            {p.shop && <Pill tone="brand">مولى محل</Pill>}
          </p>
          <p className="mt-1 text-[0.875rem] text-muted">{p.phone ? <Num>{pretty(p.phone)}</Num> : "بلا نومرو"}</p>
          <Presence user={p.id} />
        </div>
        {p.phone && (
          <span className="flex gap-2">
            <a href={`tel:+216${digits(p.phone)}`} className="inline-flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-brand px-4 text-[0.875rem] font-bold text-white hover:bg-brand-deep">
              <Phone className="size-4" /> كلّمو
            </a>
            <a href={`https://wa.me/216${digits(p.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-[#25D366] px-4 text-[0.875rem] font-bold text-white hover:opacity-90">
              <MessageCircle className="size-4" /> واتساب
            </a>
          </span>
        )}
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Stats cols={3}>
            <Stat icon={WalletCards} label="كارطات" value={p.cards.length} />
            <Stat icon={Stamp} label="تامبونات" value={stamps} tone="brand" />
            <Stat icon={Gift} label="كادوات خذاهم" value={gifts} tone="coral" />
          </Stats>

          <Card title="الكارطات متاعو" hint="في كل محل، وين وصل" pad={false}>
            {p.cards.length === 0 ? (
              <Empty>ما عندو حتى كارط</Empty>
            ) : (
              <Table head={["المحل", "كادوات", "الكارط", "آخر مرّة"]}>
                {p.cards.map((c, i) => (
                  <Row key={i}>
                    <Cell strong>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem]" style={{ background: c.color }}>
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

        <aside className="min-w-0 space-y-5">
          {p.shop && (
            <Card title="المحل متاعو">
              <Link href={`/admin/shops/${p.shop.id}`} className="group flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[0.875rem]" style={{ background: p.shop.color }}>
                  <ShopMark shop={p.shop} size={28} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-ink group-hover:text-brand">{p.shop.name}</span>
                <ChevronLeft className="size-4 shrink-0 text-faint" />
              </Link>
            </Card>
          )}

          <Card title="حاجات أخرى">
            {p.admin ? <p className="text-center text-[0.875rem] font-medium text-muted">هذا أدمين: ما يتبدّلش من هوني</p> : <AdminPersonActions id={p.id} name={p.name} phone={p.phone} tester={p.tester} />}
          </Card>
        </aside>
      </div>
    </Page>
  );
}
