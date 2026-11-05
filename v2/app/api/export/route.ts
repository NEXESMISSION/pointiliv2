import { NextResponse } from "next/server";
import { call } from "@/lib/supabase";
import { xlsx, type Cell } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

type Row = { name: string | null; phone: string | null; stamps: number; total: number; given: number; waiting: number; since: string | null; last_at: string | null };
type Export = { ok: boolean; error?: string; shop?: string; rows?: Row[] };

/** 2026-11-05 14:30, Tunis time */
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Africa/Tunis" }).slice(0, 16) : null);

/**
 * «تحميل البيانات»: the owner's customers as an Excel file — asked as the owner (the database only
 * ever answers with their own shop's), and only for a shop the founder allowed it from the console
 * (export_allowed, off for every shop until then: supabase/schema.sql, my_export). The numbers come
 * masked, as in the owner's own list.
 */
export async function GET() {
  const res = await call<Export>("my_export");
  if (!res) return NextResponse.json({ ok: false, error: "network" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: res.error === "not_allowed" ? 403 : 401, headers: { "Cache-Control": "no-store" } });

  const head = ["الاسم", "التليفون", "التامبونات توّا", "كل التامبونات", "كادوات خذاهم", "كادوات تستنّى", "أول مرّة", "آخر مرّة"];
  const rows: Cell[][] = (res.rows ?? []).map((r) => [r.name ?? "—", r.phone, r.stamps, r.total, r.given, r.waiting, when(r.since), when(r.last_at)]);
  const file = xlsx("الحرفاء", head, rows, [24, 16, 14, 14, 14, 14, 18, 18]);
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pointili-clients-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
