import { NewBusinessForm } from "@/components/admin/NewBusinessForm";
import { TopBar } from "@/components/nav/TopBar";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.newBusiness.title };
}

/** Opening a shop by hand — the only way an account is ever born here. */
export default async function NewBusinessPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-md">
      <TopBar title={t.admin.newBusiness.title} subtitle={t.admin.newBusiness.subtitle} back="/admin/businesses" />
      <NewBusinessForm />
    </div>
  );
}
