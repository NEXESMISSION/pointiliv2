"use client";

import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { adminSetItems } from "@/app/actions-store";
import { AdminToggle } from "@/components/AdminToggle";

/**
 * The founder's switch for «شنوّة يبيع» on one shop: on, the counter asks
 * which of the owner's things each tampon is for before it shows the code,
 * and the console counts each thing. Off keeps what was written and what was
 * recorded. Only with things written down.
 */
export function AdminItemsSwitch({ id, on, count }: { id: string; on: boolean; count: number }) {
  const router = useRouter();
  const can = on || count > 0;
  return (
    <AdminToggle
      icon={ListChecks}
      title="شنوّة يبيع"
      on={on}
      state={on ? { say: "يسأل", tone: "mint" } : { say: "مطفي", tone: "grey" }}
      line="قبل كل تامبون، يسألوه: شنوّة خذا الحريف؟ وكل حاجة تتحسب وحدها."
      note={can ? null : "مولى المحل مازال ما كتب حتى حاجة يبيعها."}
      disabled={!can}
      flip={async () => {
        const res = await adminSetItems(id, !on);
        if (!res.ok) return res.error === "no_items" ? "مولى المحل مازال ما كتب حتى حاجة يبيعها." : "ما تعدّاتش، عاود.";
        router.refresh();
        return null;
      }}
    />
  );
}
