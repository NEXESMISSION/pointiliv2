import "server-only";
import { service } from "@/lib/supabase";

/**
 * The founder's test account (TESTER_PHONE / TESTER_PASSWORD, in .env.local
 * only): a phone he signs in with to see Pointili as anyone would — a new
 * owner, or one back after three days — and wipes as often as he likes.
 * Its visits and its views of the news stay out of the numbers (is_tester).
 */
export type TesterState = "none" | "account" | "shop";
export type TesterMode = "fresh" | "new" | "owner";

const PHONE = () => (process.env.TESTER_PHONE ?? "").replace(/\D/g, "");
const email = (d: string) => `216${d}@phone.pointidi.app`;

/** The test account's id, whether or not it already has its row in people. */
async function find(): Promise<string | null> {
  const d = PHONE();
  if (d.length !== 8) return null;
  const { data } = await service().from("people").select("id").eq("phone", `+216${d}`).maybeSingle();
  if (data?.id) return data.id as string;
  // an account made but never opened has no row yet: look it up among the sign-ins
  for (let page = 1; page <= 10; page++) {
    const { data: list } = await service().auth.admin.listUsers({ page, perPage: 200 });
    const hit = list?.users.find((u) => u.email === email(d));
    if (hit) return hit.id;
    if (!list || list.users.length < 200) break;
  }
  return null;
}

export async function testerState(): Promise<{ phone: string; ready: boolean; state: TesterState }> {
  const d = PHONE();
  const ready = d.length === 8 && !!process.env.TESTER_PASSWORD;
  const id = ready ? await find() : null;
  if (!id) return { phone: d, ready, state: "none" };
  const { data } = await service().from("shops").select("id").eq("owner_id", id).maybeSingle();
  return { phone: d, ready, state: data ? "shop" : "account" };
}

/** Everything of the test account goes: the shop, the cards, the logos, the sign-in itself. */
async function drop() {
  const id = await find();
  if (!id) return;
  const box = service().storage.from("logos");
  const { data: files } = await box.list(id, { limit: 100 });
  if (files?.length) await box.remove(files.map((f) => `${id}/${f.name}`));
  await service().auth.admin.deleteUser(id);
}

/**
 * fresh: nothing left — the phone signs up from the first screen, like anyone new.
 * new: the account, with no shop — signing in through «ادخل كمولى محل» opens the shop step by step.
 * owner: an owner back after three days — the shop and its card ready, the first-time notes behind them.
 */
export async function resetTester(mode: TesterMode): Promise<boolean> {
  const d = PHONE();
  const password = process.env.TESTER_PASSWORD ?? "";
  if (d.length !== 8 || !password) return false;
  await drop();
  if (mode === "fresh") return true;
  const { data, error } = await service().auth.admin.createUser({ email: email(d), password, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error || !data.user) return false;
  const id = data.user.id;
  await service().from("people").upsert({ id, name: "Saif", phone: `+216${d}`, is_tester: true, seen: mode === "owner" ? ["card_hello", "coach", "logo_tip", "offer"] : [] });
  if (mode === "owner") {
    await service()
      .from("shops")
      .insert({ owner_id: id, name: "Café Test", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() });
  }
  return true;
}
