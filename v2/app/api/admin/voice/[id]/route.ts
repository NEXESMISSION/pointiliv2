import { NextResponse } from "next/server";
import { call } from "@/lib/supabase";
import { founder, ours, pathOf, PRIVATE, store, unseal } from "@/lib/voice";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
type Ctx = { params: Promise<{ id: string }> };

/**
 * One voice note, played: the founder only. Its sealed file is fetched from
 * the private bucket and opened here, and the sound goes to his page alone —
 * never kept on the way, never a link to the file itself. (A page on another
 * site cannot use it: the session's cookie does not go with its requests.)
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id) || !(await founder())) return new NextResponse(null, { status: 404, headers: PRIVATE });
  const v = await call<{ ok: boolean; mime?: string }>("admin_voice", { p_id: id });
  if (!v?.ok || !v.mime) return new NextResponse(null, { status: 404, headers: PRIVATE });
  const got = await store().download(pathOf(id));
  if (got.error || !got.data) return new NextResponse(null, { status: 404, headers: PRIVATE });
  let sound: Buffer;
  try {
    sound = unseal(id, Buffer.from(await got.data.arrayBuffer()));
  } catch {
    // touched, moved, or sealed with another key: nothing is played
    return new NextResponse(null, { status: 410, headers: PRIVATE });
  }
  return new NextResponse(new Uint8Array(sound), { headers: { ...PRIVATE, "Content-Type": v.mime, "Content-Length": String(sound.length), "Content-Disposition": "inline" } });
}

/** A voice note taken back: its row, then its file. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ours(req)) return NextResponse.json({ ok: false }, { status: 403, headers: PRIVATE });
  if (!UUID.test(id) || !(await founder())) return NextResponse.json({ ok: false }, { status: 404, headers: PRIVATE });
  const res = await call<{ ok: boolean }>("admin_voice_drop", { p_id: id });
  if (!res?.ok) return NextResponse.json({ ok: false }, { status: 404, headers: PRIVATE });
  await store().remove([pathOf(id)]);
  return NextResponse.json({ ok: true }, { headers: PRIVATE });
}
