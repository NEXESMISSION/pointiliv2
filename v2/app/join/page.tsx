import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "اعمل كونت" };

export default async function Join({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, me] = await Promise.all([searchParams, getMe()]);
  if (me) redirect(next?.startsWith("/") ? next : homeOf(me));
  return (
    <Screen>
      <Top back="/" />
      <Middle>
        <Heading title={t.joinTitle} hint={t.joinHint} />
        <AuthForm mode="join" next={next} />
      </Middle>
    </Screen>
  );
}
