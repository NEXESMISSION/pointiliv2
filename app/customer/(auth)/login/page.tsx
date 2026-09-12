import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";
import { getI18n } from "@/lib/i18n/server";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.login.title };
}

export default async function CustomerLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext) : undefined;
  const ctx = await getContext();
  if (ctx) redirect(next ?? homeFor(ctx));
  const { t } = await getI18n();

  return (
    <AuthShell>
      <AuthHeading title={t.auth.login.heading} subtitle={t.auth.login.subtitle} />
      {next?.startsWith("/scan/") && (
        <Alert tone="info" className="mb-5">
          {t.auth.login.scanNotice}
        </Alert>
      )}
      {next?.startsWith("/join/") && (
        <Alert tone="info" className="mb-5">
          {t.auth.login.joinNotice}
        </Alert>
      )}
      <LoginForm portal="customer" next={next} />
    </AuthShell>
  );
}
