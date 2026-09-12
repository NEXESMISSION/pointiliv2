import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.profile.changePassword };
}

export default async function ChangePasswordPage() {
  const { t } = await getI18n();
  return (
    <>
      <TopBar title={t.customer.profile.changePassword} back="/customer/profile" />
      <Card className="p-5">
        <ChangePasswordForm />
      </Card>
    </>
  );
}
