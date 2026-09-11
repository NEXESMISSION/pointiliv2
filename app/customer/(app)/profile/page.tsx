import { CreditCard, Gift, CircleHelp, KeyRound, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Stat";
import { NameForm } from "@/components/customer/NameForm";
import { InstallRow } from "@/components/InstallPrompt";
import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { initials } from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireUser("/customer/profile");
  const u = ctx.user;
  return (
    <>
      <TopBar title="Your profile" large back="/customer" />
      <Card className="flex flex-col items-center p-6 text-center">
        <Avatar label={initials(u.full_name, "P")} size={64} />
        <p className="mt-3 text-lg font-semibold tracking-tight text-ink">{u.full_name || "Pointili member"}</p>
        {u.phone && <p className="text-sm text-muted tabular">{formatPhone(u.phone)}</p>}
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
        <InstallRow />
        <ListRow href="/how-it-works" icon={<CircleHelp className="size-5" />} title="How Pointili works" />
      </Divided>

      <form action={logout} className="mt-5">
        <Divided>
          <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 px-4 text-[15px] font-medium text-danger-600 hover:bg-danger-50/60">
            <LogOut className="size-[18px]" /> Log out
          </button>
        </Divided>
      </form>
    </>
  );
}
