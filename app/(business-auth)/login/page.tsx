import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Business login" };

export default async function BusinessLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext, "/dashboard") : undefined;
  const ctx = await getContext();
  if (ctx && (ctx.business || ctx.user.role === "admin")) redirect(next ?? homeFor(ctx));

  return (
    <AuthShell>
      <AuthHeading title="Business login" subtitle="Access your merchant dashboard" />
      <LoginForm portal="business" next={next} />
    </AuthShell>
  );
}
