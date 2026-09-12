import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { getI18n } from "@/lib/i18n/server";
import { getContext } from "@/lib/session";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.business.title };
}

export default async function RegisterBusiness() {
  const ctx = await getContext();
  if (ctx?.business) redirect("/dashboard");
  const { t, fill } = await getI18n();

  return (
    <AuthShell wide>
      <AuthHeading
        title={t.auth.business.title}
        subtitle={ctx ? fill(t.auth.business.subtitleSignedIn, { who: formatPhone(ctx.user.phone) || ctx.user.email || "" }) : t.auth.business.subtitle}
      />
      <BusinessRegisterForm signedIn={!!ctx} defaultName={ctx?.user.full_name ?? ""} defaultEmail={ctx?.user.email ?? ""} />
    </AuthShell>
  );
}
