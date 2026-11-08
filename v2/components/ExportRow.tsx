"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, FileDown } from "lucide-react";
import { Mark } from "@/components/Owner";
import { fill, t } from "@/lib/t";

/**
 * «تحميل البيانات» in «المحل»: the owner's customers as an Excel file (app/api/export), once a week
 * (the founder, 8 Nov 2026). `open`: a file can be taken now — a plain link the phone downloads;
 * `next`: when the next week starts, said as the server wrote it (the same words on both sides, no
 * clock read twice). Taken: the row says so a moment later; the half hour in which the same file
 * can be taken again over (`shut`), it turns into the date of the next one by itself.
 */
export function ExportRow({ open, next, shut }: { open: boolean; next: string | null; shut: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (!open || !shut) return;
    const wait = Date.parse(shut) - Date.now();
    if (!(wait > 0)) return;
    const id = setTimeout(() => router.refresh(), Math.min(wait + 1000, 2_147_000_000));
    return () => clearTimeout(id);
  }, [open, shut, router]);

  const line = "flex items-center gap-3 px-3.5 py-[clamp(0.5rem,1.4dvh,0.8rem)]";
  const sub = !next ? t.setExportSub : open ? fill(t.setExportDone, { date: next }) : fill(t.setExportWait, { date: next });
  const body = (
    <>
      <span className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] ${open ? "" : "opacity-50"}`}>
        <Mark icon={FileDown} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-bold">{t.setExport}</span>
        <span className="block truncate text-[0.8125rem] text-muted [@media(max-height:520px)]:hidden">{sub}</span>
      </span>
    </>
  );

  if (!open) {
    return (
      <div className={line} aria-disabled="true">
        {body}
        <Clock className="size-4 shrink-0 text-faint" aria-hidden />
      </div>
    );
  }
  return (
    // a file, not a page: the phone downloads it; the row catches up once it is taken
    <a href="/api/export" download onClick={() => setTimeout(() => router.refresh(), 2500)} className={`press ${line} active:bg-canvas`}>
      {body}
      <ChevronLeft className="size-4 shrink-0 text-faint" />
    </a>
  );
}
