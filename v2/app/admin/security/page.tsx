import { Ago } from "@/components/Ago";
import { BlockButtons, BlockForm, UnblockButton } from "@/components/AdminGuard";
import { Bars, Card, Cell, Empty, Lat, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";

export const metadata = { title: "الأمان", robots: { index: false } };

type Guard = {
  day: { made: number; stopped: number; wrong: number; trap: number; ips: number };
  days: { d: string; made: number; stopped: number }[];
  ips: { ip: string; made: number; stopped: number; wrong: number; last: string; phones: string[] | null; blocked: boolean }[];
  recent: { at: string; door: string; ip: string | null; phone: string | null; why: string }[];
  blocks: { value: string; kind: "ip" | "phone"; reason: string | null; at: string; until: string | null }[];
  empty: number;
};

const DOOR: Record<string, string> = { join: "كونت جديد", login: "الدخول", form: "فورم" };
const WHY: Record<string, { label: string; tone: "coral" | "grey" | "ink" | "brand" }> = {
  blocked: { label: "مسكّر", tone: "ink" },
  limit: { label: "برشا في ساعة", tone: "coral" },
  day: { label: "برشا في نهار", tone: "coral" },
  trap: { label: "روبو (الفخ)", tone: "coral" },
  wrong: { label: "كلمة سرّ غالطة", tone: "grey" },
};
const day = (d: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d));

/**
 * «الأمان»: who knocks at the doors that make or open an account. The day's
 * numbers, two weeks of accounts made and attempts stopped, the addresses
 * that make several accounts or keep getting stopped — each one blocked in a
 * tap, for a day, a month or for good — the latest stops and why, what is
 * blocked now, and the week's accounts that never did anything. Limits on
 * their own: 30 accounts an hour and 120 a day from one address, 60 sign-ins
 * in 15 minutes from one address and 8 for one number. The founder hears of
 * an address's first stop on Telegram.
 */
export default async function Security() {
  const g = (await call<Guard>("admin_guard")) ?? null;
  if (!g) return <Page title="الأمان">{<Empty>ما نجمناش نقراو الأمان توّا</Empty>}</Page>;
  return (
    <Page title="الأمان" hint="شكون يدقّ على الكونتات: الأدرسات (IP) اللي تعمل برشا كونتات ولا تتسكّر، وتسكّرها بكليك">
      <Stats cols={5}>
        <Stat label="كونتات جديدة · 24س" value={<Num>{g.day.made}</Num>} />
        <Stat label="محاولات تسكّرت · 24س" value={<Num>{g.day.stopped}</Num>} tone={g.day.stopped ? "coral" : "ink"} />
        <Stat label="روبوات (الفخ) · 24س" value={<Num>{g.day.trap}</Num>} tone={g.day.trap ? "coral" : "ink"} />
        <Stat label="كلمة سرّ غالطة · 24س" value={<Num>{g.day.wrong}</Num>} />
        <Stat label="كونتات فارغة · 7 أيّام" value={<Num>{g.empty}</Num>} sub="لا محل لا كارط" />
      </Stats>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="الكونتات الجديدة · 14 يوم">
          {g.days.length ? <Bars rows={g.days.map((x) => ({ key: x.d, label: <Num>{day(x.d)}</Num>, sub: x.stopped ? `${x.stopped} تسكّرو` : undefined, n: x.made }))} /> : <Empty>مازال حتى حاجة</Empty>}
        </Card>
        <Card title="سكّر بالإيد" hint="IP ولا نومرو تليفون: ما عادش ينجم يعمل كونت ولا يدخل">
          <BlockForm />
          <div className="mt-4">
            {g.blocks.length === 0 ? (
              <p className="text-[0.875rem] text-muted">حتى حاجة مسكّرة توّا</p>
            ) : (
              <ul className="divide-y divide-line">
                {g.blocks.map((b) => (
                  <li key={b.value} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <Lat className="font-semibold">{b.kind === "phone" ? pretty(b.value) : b.value}</Lat>
                      <span className="block text-[0.75rem] text-muted">
                        {b.reason ?? "—"} · {b.until ? <>حتى <Num>{day(b.until)}</Num></> : "ديما"}
                      </span>
                    </span>
                    <UnblockButton value={b.value} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4" pad={false} title="الأدرسات اللي تستاهل تشوفها · 7 أيّام" hint="زوز كونتات ولا أكثر، ولا 3 مرّات تسكّر · الـ4G يجمع برشا ناس في IP واحد: شوف النومروات قبل">
        {g.ips.length === 0 ? (
          <Empty>حتى أدرسة مشبوهة</Empty>
        ) : (
          <Table head={["IP", "كونتات", "تسكّرو", "غلطو", "النومروات", "آخر مرّة", ""]} words={[0, 4]}>
            {g.ips.map((x) => (
              <Row key={x.ip}>
                <Cell>
                  <Lat className="font-semibold">{x.ip}</Lat> {x.blocked && <Pill tone="ink">مسكّر</Pill>}
                </Cell>
                <Cell n strong>
                  {x.made}
                </Cell>
                <Cell n>{x.stopped}</Cell>
                <Cell n muted>
                  {x.wrong}
                </Cell>
                <Cell muted>
                  <span className="block max-w-[16rem] truncate">
                    <Num>{(x.phones ?? []).slice(0, 4).map(pretty).join(" · ") || "—"}</Num>
                  </span>
                </Cell>
                <Cell muted>
                  <Ago at={x.last} />
                </Cell>
                <Cell>{!x.blocked && <BlockButtons value={x.ip} kind="ip" reason={`${x.made} كونتات، ${x.stopped} تسكّرو`} />}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mt-4" pad={false} title="آخر المحاولات اللي تسكّرت">
        {g.recent.length === 0 ? (
          <Empty>حتى محاولة تسكّرت</Empty>
        ) : (
          <Table head={["وقتاش", "الباب", "علاش", "IP", "النومرو", ""]} words={[1, 2]}>
            {g.recent.map((r, i) => (
              <Row key={`${r.at}-${i}`}>
                <Cell muted>
                  <Ago at={r.at} />
                </Cell>
                <Cell>{DOOR[r.door] ?? r.door}</Cell>
                <Cell>
                  <Pill tone={WHY[r.why]?.tone ?? "grey"}>{WHY[r.why]?.label ?? r.why}</Pill>
                </Cell>
                <Cell>
                  <Lat>{r.ip ?? "—"}</Lat>
                </Cell>
                <Cell muted>
                  <Num>{r.phone ? pretty(r.phone) : "—"}</Num>
                </Cell>
                <Cell>{r.phone && r.why === "trap" && <BlockButtons value={r.phone} kind="phone" reason="روبو (الفخ)" />}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}
