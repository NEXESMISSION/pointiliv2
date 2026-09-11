import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";

export const metadata = { title: "Reset your password" };

export default function ForgotPassword() {
  return (
    <AuthShell>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
