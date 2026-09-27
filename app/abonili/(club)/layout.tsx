import { LogOut } from "lucide-react";
import { abLogout } from "@/app/actions/abonili";
import { RailNav, TabBar } from "@/components/abonili/Nav";
import { getAb, requireClub } from "@/lib/abonili/server";
import { dayYear } from "@/lib/abonili/format";

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { a, fill, intl }] = await Promise.all([requireClub(), getAb()]);
  const club = ctx.club;
  const pastDue = club.paid_until !== null && club.paid_until < ctx.today;

  return (
    <div className="ab-shell">
      <aside className="ab-rail">
        <span className="ab-wordmark">Abonili</span>
        <div className="ab-well px-3 py-2.5">
          <p className="ab-trunc text-[15px] font-bold">{club.name}</p>
          <p className="ab-trunc text-[12.5px] ab-faint">{a.kinds[club.kind]}</p>
        </div>
        <RailNav />
        <form action={abLogout} className="mt-auto">
          <button type="submit" className="ab-btn ab-btn-quiet ab-btn-sm ab-btn-block">
            <LogOut aria-hidden />
            {a.settings.logout}
          </button>
        </form>
      </aside>

      <main className="ab-main">
        {club.status === "suspended" ? (
          <p className="ab-alert mb-4">{a.door.suspended}</p>
        ) : pastDue ? (
          <p className="ab-alert mb-4">{fill(a.settings.paidPast, { date: dayYear(club.paid_until, intl) })}</p>
        ) : null}
        {children}
      </main>

      <TabBar />
    </div>
  );
}
