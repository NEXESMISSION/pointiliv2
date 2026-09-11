import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <>
      <TopBar title="Change password" back="/customer/profile" />
      <Card className="p-5">
        <ChangePasswordForm />
      </Card>
    </>
  );
}
