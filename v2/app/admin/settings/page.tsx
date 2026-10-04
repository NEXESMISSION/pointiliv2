import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import { Card, Page } from "@/components/console";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "الريڤلاج" };

/** The founder's settings: the help number and the two videos owners (and the front door) show. */
export default async function AdminSettings() {
  const s = await getSettings(true);
  return (
    <Page title={t.aSettings} hint={t.aSettingsHint}>
      <Card className="max-w-[38rem]">
        <AdminSettingsForm raw={s.raw} />
      </Card>
    </Page>
  );
}
