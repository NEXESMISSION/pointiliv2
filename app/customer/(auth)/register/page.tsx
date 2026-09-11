import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Alert } from "@/components/ui/Alert";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Create your account" };

export default async function CustomerRegister({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext) : undefined;
  const ctx = await getContext();
  if (ctx) redirect(next ?? homeFor(ctx));

  return (
    <AuthShell>
      <AuthHeading title="Create your account" subtitle="Join Pointili and start collecting stamps!" />
      {next?.startsWith("/scan/") && (
        <Alert tone="info" className="mb-5">
          Create your Pointili account to collect your stamp. It takes 20 seconds, and your stamp is saved meanwhile.
        </Alert>
      )}
      <RegisterForm next={next} />
    </AuthShell>
  );
}
