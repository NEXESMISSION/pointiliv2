import { redirect } from "next/navigation";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "الريڤلاج", robots: { index: false } };

/** The founder's settings: the help number and the two videos owners (and the front door) show. */
export default async function AdminSettings() {
  const me = await getMe();
  if (!me?.admin) redirect("/");
  const s = await getSettings(true);
  return (
    <Screen>
      <Top back="/admin" />
      <Middle>
        <Heading title={t.aSettings} hint={t.aSettingsHint} />
        <AdminSettingsForm raw={s.raw} />
      </Middle>
    </Screen>
  );
}
