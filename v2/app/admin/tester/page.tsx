import { AdminTester } from "@/components/AdminTester";
import { Card, Num, Page, Pill } from "@/components/console";
import { testerState } from "@/lib/tester";
import { t } from "@/lib/t";

export const metadata = { title: "كونت التجربة", robots: { index: false } };

/** The founder's test account: what state it is in, and the three ways to start it again. */
export default async function AdminTesterPage() {
  const s = await testerState();
  const phone = s.phone.length === 8 ? `+216 ${s.phone.slice(0, 2)} ${s.phone.slice(2, 5)} ${s.phone.slice(5)}` : "—";
  return (
    <Page title={t.aTester} hint={t.aTesterHint}>
      <Card
        title={t.aTester}
        actions={<Pill tone={s.state === "shop" ? "mint" : s.state === "account" ? "brand" : "grey"}>{s.state === "shop" ? t.aTesterShop : s.state === "account" ? t.aTesterAccount : t.aTesterNone}</Pill>}
      >
        <p className="mb-3 text-[1.125rem] font-bold">
          <Num>{phone}</Num>
        </p>
        {s.ready ? <AdminTester /> : <p className="text-[0.875rem] text-coral">{t.aTesterMissing}</p>}
      </Card>
    </Page>
  );
}
