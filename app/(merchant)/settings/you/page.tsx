import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { NameForm } from "@/components/customer/NameForm";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.account };
}

/** Who is signed in: the one thing that can change, and the two that cannot. */
export default async function YourAccountPage() {
  const { t } = await getI18n();
  const ctx = await requireMerchant("/settings/you");
  const w = t.ops.settings;
  return (
    <div className="mx-auto w-full max-w-md">
      <TopBar title={w.account} back="/settings" />
      <Card className="space-y-3.5 p-3.5">
        {/* relative: the form's sr-only label is absolute and would stretch the card */}
        <div className="relative">
          <p className="mb-1.5 text-[13px] font-medium text-body">{t.common.yourName}</p>
          <NameForm defaultValue={ctx.user.full_name ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-3 text-[13px]">
          <div>
            <p className="text-muted">{w.loginPhone}</p>
            <p className="font-medium text-ink tabular">
              <span dir="ltr" className="inline-block">{formatPhone(ctx.user.phone) || "—"}</span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-muted">{w.email}</p>
            <p className="truncate font-medium text-ink">
              <span dir="ltr" className="inline-block">{ctx.user.email || "—"}</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
