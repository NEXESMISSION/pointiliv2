import { NewShopWizard } from "@/components/admin/NewShopWizard";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.newBusiness.title };
}

/** Opening a shop by hand — the only way an account is ever born here — in six steps (board 9). */
export default function NewBusinessPage() {
  return <NewShopWizard />;
}
