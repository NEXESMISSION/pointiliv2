import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { PlansManager } from "@/components/merchant/PlansManager";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { MembershipPlan } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.merchant.abonili.plansTitle };
}

export default async function FormulesPage() {
  const [{ t }, plans] = await Promise.all([getI18n(), rpc<MembershipPlan[]>("merchant_membership_plans")]);
  const w = t.merchant.abonili;

  return (
    <div className="mx-auto max-w-md">
      <TopBar title={w.plansTitle} back="/members" subtitle={w.plansSubtitle} />
      <PlansManager plans={plans} />
    </div>
  );
}
