import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { call } from "@/lib/supabase";
import { founder, MAX_BYTES, MAX_SECS, MIMES, ours, pathOf, PRIVATE, seal, store } from "@/lib/voice";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * A voice note recorded on the console, for a shop: the founder only, from
 * our own page. The sound is checked (a sound, not too long, not too heavy),
 * sealed under a new id (lib/voice.ts), put in the private bucket, and only
 * then written down — if the writing fails, the file goes too.
 */
export async function POST(req: Request) {
  if (!ours(req)) return NextResponse.json({ ok: false }, { status: 403, headers: PRIVATE });
  if (!(await founder())) return NextResponse.json({ ok: false }, { status: 404, headers: PRIVATE });

  const form = await req.formData().catch(() => null);
  const shop = String(form?.get("shop") ?? "");
  const secs = Math.round(Number(form?.get("secs")));
  const file = form?.get("sound");
  if (!UUID.test(shop) || !Number.isFinite(secs) || !(file instanceof Blob)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400, headers: PRIVATE });
  const mime = file.type.split(";")[0]!.trim().toLowerCase();
  if (!(MIMES as readonly string[]).includes(mime)) return NextResponse.json({ ok: false, error: "type" }, { status: 415, headers: PRIVATE });
  if (file.size < 200 || file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "size" }, { status: 413, headers: PRIVATE });

  const id = randomUUID();
  const sealed = seal(id, Buffer.from(await file.arrayBuffer()));
  const put = await store().upload(pathOf(id), sealed, { contentType: "application/octet-stream", upsert: false });
  if (put.error) return NextResponse.json({ ok: false, error: "store" }, { status: 502, headers: PRIVATE });

  const res = await call<{ ok: boolean; error?: string }>("admin_voice_add", { p_id: id, p_shop: shop, p_secs: Math.min(Math.max(secs, 1), MAX_SECS), p_bytes: file.size, p_mime: mime });
  if (!res?.ok) {
    await store().remove([pathOf(id)]);
    return NextResponse.json({ ok: false, error: res?.error ?? "db" }, { status: res?.error === "too_many" ? 429 : 400, headers: PRIVATE });
  }
  return NextResponse.json({ ok: true, voice: { id, secs: Math.min(Math.max(secs, 1), MAX_SECS), at: new Date().toISOString() } }, { headers: PRIVATE });
}
