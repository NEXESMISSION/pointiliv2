import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { NameForm } from "@/components/NameForm";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { spaced } from "@/lib/phone";
import { t } from "@/lib/t";

export const metadata = { title: "الكونت" };

export default async function Account() {
  const me = await getMe();
  if (!me) redirect("/login?next=/me");
  return (
    <Screen>
      <Top back={me.shop ? "/shop/settings" : "/"} title={t.account} />
      <div className="mt-6 space-y-5">
        <NameForm name={me.name} />
        {me.phone && (
          <div>
            <p className="mb-1.5 px-1 text-[14px] font-semibold text-muted">{t.phone}</p>
            <p className="num rounded-[18px] bg-surface px-4 py-4 text-start text-[17px] shadow-card">+216 {spaced(me.phone)}</p>
          </div>
        )}
      </div>
      <form action={logout} className="mt-auto pt-8">
        <button type="submit" className="press flex h-[56px] w-full items-center justify-center gap-2 rounded-[20px] bg-surface text-[17px] font-semibold text-coral shadow-card">
          <LogOut className="size-5" /> {t.logout}
        </button>
      </form>
    </Screen>
  );
}
