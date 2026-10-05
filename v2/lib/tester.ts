import "server-only";
import { service } from "@/lib/supabase";

/**
 * The founder's test account: a phone he signs in with to see Pointili as
 * anyone would — a new owner, or one back after three days — and starts
 * again as often as he likes. Its visits and its views of the news stay out
 * of the numbers (is_tester).
 *
 * It works the same on the live site: starting again keeps the sign-in (and
 * its password) and changes only what is behind it. Only «امسحو» removes the
 * sign-in itself; after it, the number signs up again from the first screen
 * (or, where TESTER_PASSWORD is set, e.g. on the founder's computer, it is
 * made again with that password).
 */
export type TesterState = "none" | "account" | "shop";
export type TesterMode = "fresh" | "new" | "owner";
export type TesterResult = "ok" | "no_account" | "error";

/** The test number: TESTER_PHONE, or the founder's own test line. */
const PHONE = () => (process.env.TESTER_PHONE || "58415521").replace(/\D/g, "");
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

export async function testerState(): Promise<{ phone: string; ready: boolean; state: TesterState; canMake: boolean }> {
  const d = PHONE();
  const ready = d.length === 8;
  const id = ready ? await find() : null;
  const canMake = !!process.env.TESTER_PASSWORD;
  if (!id) return { phone: d, ready, state: "none", canMake };
  const { data } = await service().from("shops").select("id").eq("owner_id", id).maybeSingle();
  return { phone: d, ready, state: data ? "shop" : "account", canMake };
}

/** The test account's shop goes (its cards, its moments, its payments with it) and its logos. */
async function clear(id: string) {
  const box = service().storage.from("logos");
  const { data: files } = await box.list(id, { limit: 100 });
  if (files?.length) await box.remove(files.map((f) => `${id}/${f.name}`));
  await service().from("shops").delete().eq("owner_id", id);
  await service().from("cards").delete().eq("user_id", id);
  // the news it saw: shown again, like to anyone new
  await service().from("news_views").delete().eq("person_id", id);
}

/**
 * fresh: nothing left — the phone signs up from the first screen, like anyone new.
 * new: the account, with no shop — signing in through «ادخل كمولى محل» opens the shop step by step.
 * owner: an owner back after three days — the shop and its card ready, the first-time notes behind them.
 */
export async function resetTester(mode: TesterMode): Promise<TesterResult> {
  const d = PHONE();
  if (d.length !== 8) return "error";
  let id = await find();
  if (mode === "fresh") {
    if (id) {
      await clear(id);
      await service().auth.admin.deleteUser(id);
    }
    return "ok";
  }
  if (id) await clear(id);
  else {
    // no sign-in to keep: made again only where its password is known
    const password = process.env.TESTER_PASSWORD ?? "";
    if (!password) return "no_account";
    const { data, error } = await service().auth.admin.createUser({ email: email(d), password, email_confirm: true, app_metadata: { phone: `+216${d}` } });
    if (error || !data.user) return "error";
    id = data.user.id;
  }
  const { error } = await service()
    .from("people")
    .upsert({ id, name: "Saif", phone: `+216${d}`, is_tester: true, seen: mode === "owner" ? ["card_hello", "coach", "logo_tip", "offer"] : [] });
  if (error) return "error";
  if (mode === "owner") {
    const { error: e2 } = await service()
      .from("shops")
      .insert({ owner_id: id, name: "Café Test", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() });
    if (e2) return "error";
  }
  return "ok";
}
