/**
 * The founder's test account (TESTER_PHONE / TESTER_PASSWORD in .env.local),
 * from the command line — the console's «كونت التجربة» does the same.
 *
 *   node scripts/tester.mjs fresh   nothing left: sign up from the first screen
 *   node scripts/tester.mjs new     the account, no shop: open it step by step
 *   node scripts/tester.mjs owner   a shop opened 3 days ago, card ready
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const mode = process.argv[2];
if (!["fresh", "new", "owner"].includes(mode)) throw new Error("mode: fresh | new | owner");
const d = String(process.env.TESTER_PHONE ?? "").replace(/\D/g, "");
const password = process.env.TESTER_PASSWORD ?? "";
if (d.length !== 8 || !password) throw new Error("TESTER_PHONE / TESTER_PASSWORD missing in .env.local");
const email = `216${d}@phone.pointidi.app`;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let id = (await admin.from("people").select("id").eq("phone", `+216${d}`).maybeSingle()).data?.id ?? null;
if (!id) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  id = data?.users.find((u) => u.email === email)?.id ?? null;
}
if (id) {
  const { data: files } = await admin.storage.from("logos").list(id, { limit: 100 });
  if (files?.length) await admin.storage.from("logos").remove(files.map((f) => `${id}/${f.name}`));
  await admin.auth.admin.deleteUser(id);
}
if (mode !== "fresh") {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("people").upsert({ id: uid, name: "Saif", phone: `+216${d}`, is_tester: true, seen: mode === "owner" ? ["card_hello", "coach", "logo_tip", "offer"] : [] });
  if (mode === "owner") {
    await admin.from("shops").insert({ owner_id: uid, name: "Café Test", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() });
  }
}
console.log(`✓ test account (+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}): ${mode}`);
