import { PlansEditor } from "@/components/abonili/PlansEditor";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import type { AbPlan } from "@/lib/abonili/types";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.plans.title };
}

export default async function PlansPage() {
  const [, { a }] = await Promise.all([requireClub("/abonili/plans"), getAb()]);
  const plans = await abRpc<AbPlan[]>("ab_plans");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="ab-h1">{a.plans.title}</h1>
        <p className="mt-2 text-[15px] ab-dim">{a.plans.hint}</p>
      </header>
      <PlansEditor plans={plans} />
    </div>
  );
}
