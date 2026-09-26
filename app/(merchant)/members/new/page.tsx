import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { AddMemberForm } from "@/components/merchant/AddMemberForm";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { MembershipPlan } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.merchant.abonili.newTitle };
}

/**
 * There is nothing to sell before there is a formule, so this page says that
 * plainly instead of showing an empty dropdown next to a dead button.
 */
export default async function NewMemberPage() {
  const { t } = await getI18n();
  const w = t.merchant.abonili;
  const plans = (await rpc<MembershipPlan[]>("merchant_membership_plans")).filter((p) => p.active);

  return (
    <div className="mx-auto max-w-md">
      <TopBar title={w.newTitle} back="/members" subtitle={plans.length ? w.newSubtitle : undefined} />
      {plans.length === 0 ? (
        <EmptyState icon={<Tag className="size-8" />} title={w.noPlansTitle} action={<LinkButton href="/formules" block>{w.goToPlans}</LinkButton>}>
          {w.noPlansBody}
        </EmptyState>
      ) : (
        <Card className="p-4">
          <AddMemberForm plans={plans} />
        </Card>
      )}
    </div>
  );
}
