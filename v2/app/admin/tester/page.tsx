import { AdminRobots } from "@/components/AdminRobots";
import { AdminTester } from "@/components/AdminTester";
import { Card, CLink, Num, Page, Pill } from "@/components/console";
import { call } from "@/lib/supabase";
import { testerState } from "@/lib/tester";
import { t } from "@/lib/t";

export const metadata = { title: "كونت التجربة", robots: { index: false } };

/**
 * Everything that is not a real client, in one place: the founder's test
 * account and its three ways to start again; where the test shops and
 * accounts are listed (apart from the real ones); and the scripts' own
 * accounts — never shown anywhere else — with a sweep for any left behind.
 */
export default async function AdminTesterPage() {
  const [s, robots] = await Promise.all([testerState(), call<{ accounts: number; shops: number }>("admin_robots")]);
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

      <Card className="mt-4" title={t.aTests} hint={t.aTestsHint}>
        <div className="flex flex-wrap gap-2">
          <CLink href="/admin/shops?tests=1">{t.aTestsShops}</CLink>
          <CLink href="/admin/people?tests=1">{t.aTestsPeople}</CLink>
        </div>
      </Card>

      <Card className="mt-4" title={t.aRobots} hint={t.aRobotsHint}>
        <AdminRobots left={robots?.accounts ?? 0} />
      </Card>
    </Page>
  );
}
