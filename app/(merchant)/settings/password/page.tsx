import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.changePassword };
}

export default async function MerchantPasswordPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title={t.ops.settings.changePassword} back="/settings" />
      <Card className="p-5">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
