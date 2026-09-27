import { LogOut, MessageCircle } from "lucide-react";
import { abLogout } from "@/app/actions/abonili";
import { ClubForm, LanguageSwitch, PasswordForm } from "@/components/abonili/SettingsForms";
import { getAb, requireClub } from "@/lib/abonili/server";
import { dayYear, phoneLocal } from "@/lib/abonili/format";
import { whatsappNumber } from "@/lib/support";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.settings.title };
}

export default async function SettingsPage() {
  const [ctx, { a, fill, intl }] = await Promise.all([requireClub("/abonili/settings"), getAb()]);
  const support = whatsappNumber();
  const paid = ctx.club.paid_until;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="ab-h1">{a.settings.title}</h1>

      {paid && (
        <p className={paid < ctx.today ? "ab-alert" : "ab-ok"}>
          {fill(paid < ctx.today ? a.settings.paidPast : a.settings.paidUntil, { date: dayYear(paid, intl) })}
        </p>
      )}

      <section className="ab-panel space-y-4 p-5">
        <h2 className="text-[18px] font-extrabold">{a.settings.club}</h2>
        <ClubForm club={ctx.club} />
      </section>

      <section className="ab-panel space-y-3 p-5">
        <h2 className="text-[18px] font-extrabold">{a.settings.language}</h2>
        <LanguageSwitch />
      </section>

      <section className="ab-panel space-y-4 p-5">
        <div>
          <h2 className="text-[18px] font-extrabold">{a.settings.account}</h2>
          <p className="ab-ltr mt-1 text-[14px] ab-dim">{ctx.user.name ? `${ctx.user.name} · ` : ""}{phoneLocal(ctx.user.phone)}</p>
        </div>
        <h3 className="text-[15px] font-bold">{a.settings.password}</h3>
        <PasswordForm />
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        {support && (
          <a href={`https://wa.me/${support}`} target="_blank" rel="noopener noreferrer" className="ab-btn ab-btn-ghost">
            <MessageCircle aria-hidden />
            {a.settings.support}
          </a>
        )}
        <form action={abLogout}>
          <button type="submit" className="ab-btn ab-btn-danger ab-btn-block">
            <LogOut aria-hidden />
            {a.settings.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
