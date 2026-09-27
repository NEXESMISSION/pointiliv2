import { ClubRow, NewClubForm, type AdminClub } from "@/components/admin/AbClubs";
import { TopBar } from "@/components/nav/TopBar";
import { SectionTitle } from "@/components/ui/Card";
import { abI18n } from "@/lib/abonili/i18n";
import { tunisToday } from "@/lib/abonili/format";
import { getLocale } from "@/lib/i18n/server";
import { requireAdmin, rpc } from "@/lib/session";
import { siteUrl } from "@/lib/url";

export async function generateMetadata() {
  const { a } = abI18n(await getLocale());
  return { title: a.admin.title };
}

/** The founder's view of the second product: open a club, mark it paid, stop it. */
export default async function AdminAbonili() {
  await requireAdmin();
  const { a } = abI18n(await getLocale());
  const clubs = await rpc<AdminClub[]>("ab_admin_clubs");
  const today = tunisToday();

  return (
    <div className="animate-fade space-y-6">
      <TopBar title={a.admin.title} subtitle={a.admin.subtitle} back="/admin" large />
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <section>
          <SectionTitle>{a.admin.newClub}</SectionTitle>
          <NewClubForm loginUrl={`${siteUrl()}/abonili/login`} />
        </section>
        <section className="space-y-3">
          <SectionTitle>{a.admin.title} · {clubs.length}</SectionTitle>
          {clubs.length === 0 ? (
            <p className="text-sm text-muted">{a.admin.none}</p>
          ) : (
            clubs.map((c) => <ClubRow key={c.id} c={c} today={today} />)
          )}
        </section>
      </div>
    </div>
  );
}
