"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setRewardActive } from "@/app/actions/merchant";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";

export function RewardToggle({ reward }: { reward: { id: string; name: string; description: string | null; stamps_required: number; active: boolean } }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const { t, fill } = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={reward.active}
      aria-label={fill(reward.active ? t.merchant.rewards.pauseAria : t.merchant.rewards.activateAria, { name: reward.name })}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setRewardActive(reward.id, !reward.active, reward);
          toast(res.ok ? (reward.active ? t.merchant.rewards.pausedToast : t.merchant.rewards.activated) : res.message, res.ok ? "success" : "error");
          router.refresh();
        })
      }
      className="grid h-11 w-14 place-items-center disabled:opacity-50"
    >
      <span className={`relative h-7 w-12 rounded-full transition ${reward.active ? "bg-success-500" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start] ${reward.active ? "start-[1.375rem]" : "start-0.5"}`} />
      </span>
    </button>
  );
}
