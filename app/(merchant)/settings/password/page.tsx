import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata = { title: "Change password" };

export default function MerchantPasswordPage() {
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Change password" back="/settings" />
      <Card className="p-5">
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
