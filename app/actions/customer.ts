"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export async function requestRedemption(rewardId: string): Promise<{ ok: false; error: string } | never> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_redemption", { p_reward_id: rewardId });
  const res = data as { ok: boolean; id?: string; error?: string } | null;
  if (error || !res?.ok || !res.id) {
    const { msg } = await getI18n();
    return { ok: false, error: msg(res?.error ?? "network") };
  }
  redirect(`/customer/rewards/use/${res.id}`);
}

export async function cancelRedemption(id: string) {
  const supabase = await createClient();
  await supabase.rpc("cancel_redemption", { p_id: id });
  revalidatePath("/customer/rewards");
  redirect("/customer/rewards");
}
