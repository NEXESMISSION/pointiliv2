import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "اعمل كونت" };

export default async function Join({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, me] = await Promise.all([searchParams, getMe()]);
  if (me) redirect(next?.startsWith("/") ? next : homeOf(me));
  return (
    <Screen>
      <Top back="/" title={t.joinTitle} hint={t.joinHint} />
      <div className="mt-7 flex flex-1 flex-col">
        <AuthForm mode="join" next={next} />
      </div>
    </Screen>
  );
}
