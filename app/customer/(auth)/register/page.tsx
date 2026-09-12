import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Alert } from "@/components/ui/Alert";
import { getI18n } from "@/lib/i18n/server";
import { getContext, homeFor } from "@/lib/session";
import { safeNext } from "@/lib/url";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.register.title };
}

export default async function CustomerRegister({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = rawNext ? safeNext(rawNext) : undefined;
  const ctx = await getContext();
  if (ctx) redirect(next ?? homeFor(ctx));
  const { t } = await getI18n();

  return (
    <AuthShell>
      <AuthHeading title={t.auth.register.title} subtitle={t.auth.register.subtitle} />
      {next?.startsWith("/scan/") && (
        <Alert tone="info" className="mb-5">
          {t.auth.register.scanNotice}
        </Alert>
      )}
      {next?.startsWith("/join/") && (
        <Alert tone="info" className="mb-5">
          {t.auth.register.joinNotice}
        </Alert>
      )}
      <RegisterForm next={next} />
    </AuthShell>
  );
}
