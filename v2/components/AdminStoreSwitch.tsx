"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { adminSetStore } from "@/app/actions-store";
import { AdminToggle } from "@/components/AdminToggle";

/**
 * The founder's switch for one shop: its card, or the store. Asked once
 * before it turns, because the customers' screen changes with it: in the
 * store the tampons are kept and spent on the owner's things instead of
 * filling a card to a gift. Other shops, and the same customers' other
 * cards, never change.
 */
export function AdminStoreSwitch({ id, on, hasCard }: { id: string; on: boolean; hasCard: boolean }) {
  const router = useRouter();
  return (
    <AdminToggle
      icon={ShoppingBag}
      title="الماغازة"
      on={on}
      state={on ? { say: "تخدم", tone: "brand" } : { say: "مطفية", tone: "grey" }}
      line={on ? "الحرفاء يلمّو التامبونات ويشريو بيهم الحاجات اللي حطّها." : "في بلاصة الكادو: الحرفاء يلمّو التامبونات ويشريو بيهم حاجات."}
      ask={on ? "ترجّعو للكارط العادية؟ التامبونات اللي عند الحرفاء يقعدو." : "تخدّم الماغازة للمحل هذا؟ يتبدّل اللي يشوفوه الحرفاء متاعو."}
      note={!hasCard && !on ? "لازمو يعمل الكارط قبل." : null}
      disabled={!hasCard && !on}
      flip={async () => {
        const res = await adminSetStore(id, !on);
        if (!res.ok) return res.error === "no_card" ? "لازمو يعمل الكارط قبل." : "ما تعدّاتش، عاود.";
        router.refresh();
        return null;
      }}
    />
  );
}
