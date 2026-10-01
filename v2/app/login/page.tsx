import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "ادخل" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, me] = await Promise.all([searchParams, getMe()]);
  if (me) redirect(next?.startsWith("/") ? next : homeOf(me));
  return (
    <Screen>
      <Top back="/" title={t.loginTitle} hint={t.loginHint} />
      <div className="mt-7 flex flex-1 flex-col">
        <AuthForm mode="login" next={next} />
      </div>
    </Screen>
  );
}
