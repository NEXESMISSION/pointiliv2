import { redirect } from "next/navigation";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { getContext } from "@/lib/session";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Create your business" };

export default async function RegisterBusiness() {
  const ctx = await getContext();
  if (ctx?.business) redirect("/dashboard");

  return (
    <AuthShell wide>
      <AuthHeading
        title="Create your business"
        subtitle={ctx ? `Signed in as ${formatPhone(ctx.user.phone) || ctx.user.email}. Free for 30 days.` : "Start free for 30 days. No card required."}
      />
      <BusinessRegisterForm signedIn={!!ctx} defaultName={ctx?.user.full_name ?? ""} defaultEmail={ctx?.user.email ?? ""} />
    </AuthShell>
  );
}
