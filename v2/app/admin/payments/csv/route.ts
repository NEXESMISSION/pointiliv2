import type { NextRequest } from "next/server";
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
type Hand = { side: "in" | "out"; on: string; amount: number; what: string; kind: string };

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
 * The founder's books as a spreadsheet, the oldest line first. What came in:
 * one line each time a shop's access was turned on or stopped, with what
 * came in, and the lines he wrote himself in their place. `?book=out`: what
 * went out, one line an expense. UTF-8 with its mark, so Excel reads the
 * Arabic right. The founder's only: the books themselves refuse anyone else.
 */
export async function GET(request: NextRequest) {
  const books = await call<{ rows: Line[]; lines?: Hand[] }>("admin_ledger");
  if (!books) return new Response("Forbidden", { status: 403 });
  const hand = books.lines ?? [];
  const out = request.nextUrl.searchParams.get("book") === "out";
  const head = out ? ["التاريخ", "على شنوّة", "النوع", "المبلغ (د)"] : ["التاريخ", "المحل", "المولى", "التليفون", "شنوّة", "شهور", "حتى", "المبلغ (د)", "كيفاش", "ملاحظة"];
  let lines: string[];
  if (out) {
    lines = hand
      .filter((h) => h.side === "out")
      .reverse()
      .map((h) => [h.on, h.what, t.aBookKinds[h.kind] ?? h.kind, h.amount].map(cell).join(","));
  } else {
    const plan = books.rows.map((l) => ({
      at: iso(l.at),
      cells: [
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
      ] as (string | number | null)[],
    }));
    const byHand = hand.filter((h) => h.side === "in").map((h) => ({ at: h.on, cells: [h.what, null, null, `${t.aBookIn}: ${t.aBookKinds[h.kind] ?? h.kind}`, null, null, h.amount, null, null] as (string | number | null)[] }));
    lines = [...plan, ...byHand].sort((x, y) => x.at.localeCompare(y.at)).map((r) => [r.at, ...r.cells].map(cell).join(","));
  }
  const csv = "﻿" + [head.join(","), ...lines].join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pointili-${out ? "masarif-" : ""}${iso(new Date().toISOString())}.csv"`,
      "cache-control": "no-store",
    },
  });
}
