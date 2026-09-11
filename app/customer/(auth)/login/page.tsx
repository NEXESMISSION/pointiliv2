import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Log in" };

export default async function CustomerLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext) : undefined;
  const ctx = await getContext();
  if (ctx) redirect(next ?? homeFor(ctx));

  return (
    <AuthShell>
      <AuthHeading title="Welcome back 👋" subtitle="Log in to your account" />
      {next?.startsWith("/scan/") && (
        <Alert tone="info" className="mb-5">
          Log in to collect your stamp. It&apos;s saved for 20 minutes.
        </Alert>
      )}
      {next?.startsWith("/join/") && (
        <Alert tone="info" className="mb-5">
          Log in and the card is added to your phone right away.
        </Alert>
      )}
      <LoginForm portal="customer" next={next} />
    </AuthShell>
  );
}
