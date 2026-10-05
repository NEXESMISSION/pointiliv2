import { spaced } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { monthsSaid, t } from "@/lib/t";

type Line = {
  at: string;
  kind: "paid" | "until" | "end";
  months: number | null;
  until: string | null;
  amount: number | null;
  method: string | null;
  note: string | null;
  shop: { name: string };
  owner: { name: string | null; phone: string | null };
};

const TZ = "Africa/Tunis";
// 2026-10-05: a date a spreadsheet reads as a date
const iso = (s: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(s));
const WAYS: Record<string, string> = { cash: t.aPlanCash, d17: "D17", virement: "Virement", versement: "Versement", mandat: "Mandat" };
const cell = (v: string | number | null) => {
  let s = v === null ? "" : String(v);
  // a name or a note an owner wrote never runs as a formula in Excel
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The founder's books as a spreadsheet: one line each time a shop's access
 * was turned on or stopped, with what came in, the oldest first. UTF-8 with
 * its mark, so Excel reads the Arabic right. The founder's only: the books
 * themselves refuse anyone else.
 */
export async function GET() {
  const books = await call<{ rows: Line[] }>("admin_ledger");
  if (!books) return new Response("Forbidden", { status: 403 });
  const head = ["التاريخ", "المحل", "المولى", "التليفون", "شنوّة", "شهور", "حتى", "المبلغ (د)", "كيفاش", "ملاحظة"];
  const lines = [...books.rows].reverse().map((l) =>
    [
      iso(l.at),
      l.shop.name,
      l.owner.name,
      // 48 020 806: the way a Tunisian writes it, and Excel keeps it as words
      l.owner.phone ? spaced(l.owner.phone) : null,
      l.kind === "end" ? t.aPlanLogEnd : l.amount === 0 ? `${monthsSaid(l.months ?? 0)} ${t.aPlanExtra}` : l.kind === "until" ? `${t.aPlanUntil} ${l.until ? iso(l.until) : ""}` : monthsSaid(l.months ?? 0),
      l.months,
      l.until ? iso(l.until) : null,
      l.amount,
      l.method ? (WAYS[l.method] ?? l.method) : null,
      l.note,
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [head.join(","), ...lines].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pointili-${iso(new Date().toISOString())}.csv"`,
      "cache-control": "no-store",
    },
  });
}
