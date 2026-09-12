import { KeyRound } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, Divided, ListRow, SectionTitle } from "@/components/ui/Card";
import { BusinessForm } from "@/components/merchant/SettingsForms";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { NameForm } from "@/components/customer/NameForm";
import { requireMerchant } from "@/lib/session";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireMerchant("/settings");
  const isOwner = ctx.member_role === "owner";
  const b = ctx.business;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <TopBar title="Settings" large back="/more" />

      <section>
        <SectionTitle>Your shop</SectionTitle>
        <Card className="p-5">
          <BrandingEditor bare logo={b.logo_url} cover={b.cover_url} icon={ctx.card?.icon} color={ctx.card?.color} disabled={!isOwner} />
          <div className="my-5 h-px bg-line" />
          <BusinessForm business={b} disabled={!isOwner} />
        </Card>
      </section>

      <section>
        <SectionTitle>You</SectionTitle>
        <Card className="space-y-4 p-5">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-body">Your name</p>
            <NameForm defaultValue={ctx.user.full_name ?? ""} />
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted">Phone (login)</p>
              <p className="font-medium text-ink tabular">{formatPhone(ctx.user.phone) || "—"}</p>
            </div>
            <div>
              <p className="text-muted">Email</p>
              <p className="truncate font-medium text-ink">{ctx.user.email || "—"}</p>
            </div>
          </div>
        </Card>
        <Divided className="mt-3">
          <ListRow href="/settings/password" icon={<KeyRound className="size-5" />} title="Change password" />
        </Divided>
      </section>
    </div>
  );
}
