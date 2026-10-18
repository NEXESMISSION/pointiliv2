"use client";

import { useRouter } from "next/navigation";
import { Disc3 } from "lucide-react";
import { adminSetWheel } from "@/app/actions-wheel";
import { AdminToggle } from "@/components/AdminToggle";

/**
 * The founder's switch for one shop: the wheel allowed, or not. Allowed, the
 * owner finds «الروليت» among the answers to his card's gift and turns it on
 * himself (then a full card is a turn — «دورة» — instead of the one gift).
 * Taken away, it is off too; the turns already won stay, to be spun.
 * `on` is «allowed», `active` is the owner's own switch.
 */
export function AdminWheelSwitch({ id, on, active = false, hasCard, store }: { id: string; on: boolean; active?: boolean; hasCard: boolean; store: boolean }) {
  const router = useRouter();
  return (
    <AdminToggle
      icon={Disc3}
      title="الروليت"
      on={on}
      state={active ? { say: "تخدم عند الحرفاء", tone: "brand" } : on ? { say: "مسموحة", tone: "mint" } : { say: "موش مسموحة", tone: "grey" }}
      line={active ? "الحريف كي يكمّل الكارط يدوّر الروليت ويربح كادو." : on ? "مولى المحل يخدّمها من الكارط متاعو وقت يحب." : "الحريف كي يكمّل الكارط يدوّر ويربح كادو. اسمحلو وهو يخدّمها."}
      ask={on ? "تنحّي الروليت؟ تتطفى للحرفاء، واللي ربحو دورة تقعدلهم." : "تسمح بالروليت للمحل هذا؟"}
      note={!hasCard ? "لازمو يعمل الكارط قبل." : store && !on ? "الماغازة خدّامة: الروليت ما تمشيش معاها." : null}
      disabled={!hasCard && !on}
      flip={async () => {
        const res = await adminSetWheel(id, !on);
        if (!res.ok) return res.error === "no_card" ? "لازمو يعمل الكارط قبل." : "ما تعدّاتش، عاود.";
        router.refresh();
        return null;
      }}
    />
  );
}
