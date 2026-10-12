"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ListChecks } from "lucide-react";
import { adminSetItems } from "@/app/actions-store";

/**
 * The founder's switch for «شنوّة يبيع» on one shop: on, the counter asks
 * which of the owner's things each tampon is for before it shows the code,
 * and the console counts each thing. Off keeps what was written and what was
 * recorded. Only with things written down.
 */
export function AdminItemsSwitch({ id, on, count }: { id: string; on: boolean; count: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const can = on || count > 0;

  const flip = () =>
    start(async () => {
      const res = await adminSetItems(id, !on);
      if (!res.ok) setError(res.error === "no_items" ? "المولى ما كتب حتى حاجة: لازم يكتب شنوّة يبيع قبل" : "ما تعدّاتش، عاود");
      else {
        setError(null);
        router.refresh();
      }
    });

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[0.75rem] ${on ? "bg-mint text-white" : "bg-canvas text-muted"}`}>
          <ListChecks className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-[0.8438rem] leading-relaxed text-body">
          {on
            ? "خدّام: الكونتوار يسأل على شنوّة التامبون قبل ما يورّي الكود، وكل حاجة تتحسب وحدها."
            : "مطفي: الكونتوار يورّي الكود طول. كي تخدّمو، يسأل المولى على شنوّة التامبون (من الحاجات اللي كتبها) قبل الكود."}
        </p>
      </div>
      <button
        type="button"
        disabled={pending || !can}
        onClick={flip}
        className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-50 ${on ? "border border-line bg-surface text-body hover:border-coral hover:text-coral" : "bg-mint text-white hover:opacity-90"}`}
      >
        {pending ? "…" : on ? "طفّي" : "خدّم «شنوّة يبيع»"}
      </button>
      {!can && <p className="text-center text-[0.75rem] text-muted">المولى مازال ما كتب حتى حاجة</p>}
      {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}
