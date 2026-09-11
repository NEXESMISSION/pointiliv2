import { CreditCard, Gift, CircleHelp, KeyRound, LogOut, Store } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Stat";
import { NameForm } from "@/components/customer/NameForm";
import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireUser("/customer/profile");
  const u = ctx.user;
  return (
    <>
      <TopBar title="Your profile" large />
      <Card className="flex flex-col items-center p-6 text-center">
        <Avatar label={initials(u.full_name, "P")} size={72} />
        <p className="mt-3 text-lg font-bold text-ink">{u.full_name || "Pointidi member"}</p>
        {u.phone && <p className="text-muted tabular">{formatPhone(u.phone)}</p>}
        <div className="mt-5 w-full">
          <NameForm defaultValue={u.full_name ?? ""} />
        </div>
      </Card>

      <Divided className="mt-5">
        <ListRow href="/customer/cards" icon={<CreditCard className="size-5" />} title="My cards" />
        <ListRow href="/customer/rewards" icon={<Gift className="size-5" />} title="My rewards" />
        <ListRow href="/customer/profile/password" icon={<KeyRound className="size-5" />} title="Change password" subtitle="••••••••" />
      </Divided>

      <Divided className="mt-5">
        <ListRow href="/how-it-works" icon={<CircleHelp className="size-5" />} title="How Pointidi works" />
        {ctx.business ? (
          <ListRow href="/dashboard" icon={<Store className="size-5" />} title="Business dashboard" subtitle={ctx.business.name} />
        ) : (
          <ListRow href="/register" icon={<Store className="size-5" />} title="Own a business?" subtitle="Create your loyalty card" />
        )}
      </Divided>

      <form action={logout} className="mt-6">
        <button type="submit" className="mx-auto flex h-12 items-center gap-2 rounded-2xl border border-danger-500/40 bg-white px-6 font-semibold text-danger-600 hover:bg-danger-50">
          <LogOut className="size-5" /> Log out
        </button>
      </form>
    </>
  );
}
