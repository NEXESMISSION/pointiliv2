import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AddMemberForm } from "@/components/abonili/AddMemberForm";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import type { AbPlan } from "@/lib/abonili/types";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.add.title };
}

export default async function NewMemberPage() {
  const [ctx, { a }] = await Promise.all([requireClub("/abonili/members/new"), getAb()]);
  const plans = await abRpc<AbPlan[]>("ab_plans");
  if (!plans.some((p) => p.active)) redirect("/abonili/plans");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/abonili/members" className="inline-flex items-center gap-1 text-[14px] font-semibold ab-dim">
        <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
        {a.member.back}
      </Link>
      <h1 className="ab-h1">{a.add.title}</h1>
      <AddMemberForm plans={plans} today={ctx.today} />
    </div>
  );
}
