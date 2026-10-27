/**
 * The founder's voice notes, attacked from every side (27 Oct 2026: «super
 * secure — I don't want to get hacked one day and all the vocals get out»):
 * the table, the functions, the bucket and the two routes, tried as nobody,
 * as an owner and as the founder — and the file in the bucket read as a thief
 * with the service key would read it: sealed, not a sound; touched, it never
 * plays. Its own throwaway accounts, on the robots list first, removed at the
 * end with everything they made.
 *
 *   node scripts/voice.mjs          (from v2/, with the dev server on :3200 — or BASE=)
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REF = new URL(URL_).hostname.split(".")[0];
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  }
};

const users = [];
const phones = [];
/** a throwaway account, signed in: its client, and the cookies a browser of it would carry */
async function person(name, isAdmin = false) {
  const digits = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(digits);
  const password = randomBytes(12).toString("base64url");
  const email = `216${digits}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${digits}`, is_admin: isAdmin });
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s } = await client.auth.signInWithPassword({ email, password });
  // the session as @supabase/ssr writes it: base64url behind «base64-», cut in pieces past 3180 characters
  const key = `sb-${REF}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(s.session)).toString("base64url");
  const parts = value.length <= 3180 ? [[key, value]] : value.match(/.{1,3180}/g).map((v, i) => [`${key}.${i}`, v]);
  return { id: data.user.id, client, cookie: parts.map(([k, v]) => `${k}=${v}`).join("; ") };
}

const send = (path, { who, method = "GET", body, origin = BASE } = {}) =>
  fetch(`${BASE}${path}`, {
    method,
    body,
    redirect: "manual",
    headers: { ...(who ? { cookie: who.cookie } : {}), ...(method !== "GET" && origin ? { origin } : {}), ...(method !== "GET" ? { "sec-fetch-site": origin === BASE ? "same-origin" : "cross-site" } : {}) },
  });
const upload = (who, shop, sound, { type = "audio/webm", origin } = {}) => {
  const fd = new FormData();
  fd.set("shop", shop);
  fd.set("secs", "7");
  fd.set("sound", new Blob([sound], { type }), "note");
  return send("/api/admin/voice", { who, method: "POST", body: fd, origin });
};

let shopId = null;
const made = [];
try {
  const boss = await person("zz Boss", true);
  const owner = await person("zz Owner");
  await owner.client.rpc("open_shop", { p_name: "zz Voice Test", p_kind: "cafe" });
  shopId = (await owner.client.rpc("me")).data.shop.id;
  // a sound: random bytes, with a line the founder might say at the front, to look for in the bucket
  const SAID = Buffer.from("SECRET: the owner said he pays on Friday, 120 dinars cash");
  const sound = Buffer.concat([SAID, randomBytes(4000)]);

  console.log("\nThe routes");
  check("nobody signed in cannot write one", [403, 404].includes((await upload(null, shopId, sound)).status));
  check("an owner cannot write one", (await upload(owner, shopId, sound)).status === 404);
  check("the founder from another site (his cookies carried by a form there) is refused", (await upload(boss, shopId, sound, { origin: "https://evil.example" })).status === 403);
  check("not a sound: refused", (await upload(boss, shopId, sound, { type: "text/html" })).status === 415);
  check("too heavy: refused", (await upload(boss, shopId, Buffer.alloc(3_100_000, 1))).status === 413);
  const res = await upload(boss, shopId, sound);
  const body = await res.json().catch(() => ({}));
  const id = body?.voice?.id;
  if (id) made.push(id);
  check("the founder writes one, from our own page", res.status === 200 && body.ok && /^[0-9a-f-]{36}$/.test(id ?? ""), { status: res.status, body });

  console.log("\nThe file in the bucket, as a thief with the service key would see it");
  const { data: raw } = await admin.storage.from("voices").download(`v/${id}`);
  const bytes = raw ? Buffer.from(await raw.arrayBuffer()) : Buffer.alloc(0);
  check("it is there, under its id alone", bytes.length > 0);
  check("sealed: not the sound", bytes.length > 0 && !bytes.equals(sound) && bytes.subarray(0, 3).toString() === "PV1");
  check("  → the words said are nowhere in it", bytes.length > 0 && bytes.indexOf(SAID) === -1 && bytes.indexOf(Buffer.from("120 dinars")) === -1);
  const { data: row } = await admin.from("crm_voice").select("*").eq("id", id).single();
  check("its row holds no sound: which shop, how long, when", row && !Object.values(row).some((v) => typeof v === "string" && v.length > 200), row);

  console.log("\nThe database and the bucket, from outside");
  check("nobody signed in cannot read the table", !(await anon.from("crm_voice").select("id").limit(1)).data?.length);
  check("an owner cannot read the table", !(await owner.client.from("crm_voice").select("id").limit(1)).data?.length);
  check("an owner cannot list a shop's notes", !!(await owner.client.rpc("admin_voices", { p_shop: shopId })).error);
  check("…nor write one", !!(await owner.client.rpc("admin_voice_add", { p_id: crypto.randomUUID(), p_shop: shopId, p_secs: 5, p_bytes: 900, p_mime: "audio/webm" })).error);
  check("…nor take one back", !!(await owner.client.rpc("admin_voice_drop", { p_id: id })).error || (await owner.client.rpc("admin_voice_drop", { p_id: id })).data?.ok !== true);
  check("nobody signed in cannot download the file", !!(await anon.storage.from("voices").download(`v/${id}`)).error);
  check("an owner cannot download the file", !!(await owner.client.storage.from("voices").download(`v/${id}`)).error);
  check("an owner cannot list the bucket", !((await owner.client.storage.from("voices").list("v")).data ?? []).length);
  const pub = await fetch(`${URL_}/storage/v1/object/public/voices/v/${id}`);
  check("no public address opens it", pub.status >= 400, pub.status);
  check("the bucket is private", (await admin.storage.getBucket("voices")).data?.public === false);

  console.log("\nPlaying it");
  check("nobody signed in hears nothing", (await send(`/api/admin/voice/${id}`)).status === 404);
  check("an owner hears nothing", (await send(`/api/admin/voice/${id}`, { who: owner })).status === 404);
  const play = await send(`/api/admin/voice/${id}`, { who: boss });
  const heard = Buffer.from(await play.arrayBuffer());
  check("the founder hears it, exactly as recorded", play.status === 200 && heard.equals(sound), { status: play.status, len: heard.length });
  check("  → never kept on the way", /no-store/.test(play.headers.get("cache-control") ?? "") && play.headers.get("cross-origin-resource-policy") === "same-origin");
  check("the founder's list has it", ((await boss.client.rpc("admin_voices", { p_shop: shopId })).data ?? []).some((v) => v.id === id));

  console.log("\nTouched in the bucket");
  const bent = Buffer.from(bytes);
  bent[bent.length - 1] ^= 0xff;
  const put1 = await admin.storage.from("voices").upload(`v/${id}`, bent, { upsert: true, contentType: "application/octet-stream" });
  const after1 = await send(`/api/admin/voice/${id}`, { who: boss });
  check("one byte changed: it never plays", after1.status === 410, { put: put1.error?.message ?? "ok", status: after1.status });
  // another note's sealed file put under this one's name: the id is bound in, it does not open
  const other = await upload(boss, shopId, Buffer.concat([Buffer.from("another note"), randomBytes(3000)]));
  const otherId = (await other.json().catch(() => ({})))?.voice?.id;
  if (otherId) made.push(otherId);
  const { data: theirs } = await admin.storage.from("voices").download(`v/${otherId}`);
  const put2 = await admin.storage.from("voices").upload(`v/${id}`, Buffer.from(await theirs.arrayBuffer()), { upsert: true, contentType: "application/octet-stream" });
  const after2 = await send(`/api/admin/voice/${id}`, { who: boss });
  check("another note's file under its name: it never plays", after2.status === 410, { put: put2.error?.message ?? "ok", status: after2.status });

  console.log("\nTaken back");
  check("an owner cannot take it back", (await send(`/api/admin/voice/${otherId}`, { who: owner, method: "DELETE" })).status === 404);
  check("…nor the founder from another site", (await send(`/api/admin/voice/${otherId}`, { who: boss, method: "DELETE", origin: "https://evil.example" })).status === 403);
  check("the founder takes it back", (await send(`/api/admin/voice/${otherId}`, { who: boss, method: "DELETE" })).status === 200);
  check("  → its file is gone from the bucket", !!(await admin.storage.from("voices").download(`v/${otherId}`)).error);
  check("  → and it plays no more", (await send(`/api/admin/voice/${otherId}`, { who: boss })).status === 404);
} catch (e) {
  failed.push(String(e?.message ?? e));
  console.log("  ✗", e);
} finally {
  if (made.length) await admin.storage.from("voices").remove(made.map((id) => `v/${id}`));
  if (shopId) await admin.from("shops").delete().eq("id", shopId);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}
