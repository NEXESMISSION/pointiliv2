"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { adminShopNote } from "@/app/admin/shops/actions";

/**
 * The founder's one line about a shop, in the shop list itself: what he would
 * otherwise keep in his head («كلّمتو، يخلّص نهار الاثنين»). Written where he
 * reads it, and saved when he leaves the field or presses Enter (Shift+Enter
 * for a new line). It grows with its words up to three lines, and sits above
 * the row's link, so typing in it never opens the shop. (20 Oct 2026: this
 * replaced the whole follow-up page, which he did not use.)
 */
export function AdminShopNote({ id, note }: { id: string; note: string }) {
  const [text, setText] = useState(note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const kept = useRef(note);
  const save = async () => {
    const v = text.trim();
    if (v === kept.current) return;
    setState("saving");
    const ok = await adminShopNote(id, v).catch(() => false);
    if (ok) {
      kept.current = v;
      setState("saved");
    } else setState("error");
  };
  return (
    <span className="relative z-[2] flex items-start gap-1.5">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        rows={1}
        maxLength={300}
        dir="auto"
        placeholder="اكتب ملاحظة…"
        aria-label="ملاحظة على المحل"
        className={`block max-h-[4.75rem] min-h-9 w-[12.5rem] resize-none rounded-[0.625rem] border bg-surface px-2.5 py-[0.4375rem] text-[0.8125rem] leading-snug text-ink [field-sizing:content] placeholder:text-faint focus:border-brand focus:outline-none ${state === "error" ? "border-coral" : "border-line/80"}`}
      />
      {/* saved: a small tick; not saved: the border turns coral and the words stay, to try again */}
      <span className="mt-2.5 grid size-4 shrink-0 place-items-center" aria-live="polite">
        {state === "saved" && <Check className="size-4 text-mint" aria-label="تسجّلت" />}
        {state === "saving" && <span className="block size-2 animate-pulse rounded-full bg-brand/50" />}
      </span>
    </span>
  );
}
