import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getI18n } from "@/lib/i18n/server";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.login.businessTitle };
}

export default async function BusinessLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext, "/dashboard") : undefined;
  const ctx = await getContext();
  if (ctx && (ctx.business || ctx.user.role === "admin")) redirect(next ?? homeFor(ctx));
  const { t } = await getI18n();

  return (
    <AuthShell>
      <AuthHeading title={t.auth.login.businessTitle} subtitle={t.auth.login.businessSubtitle} />
      <LoginForm portal="business" next={next} />
    </AuthShell>
  );
}
