"use server";

/**
 * The founder opening an Abonili club, from the console, standing in the gym.
 * Same shape as opening a Pointili shop: the auth user is minted with the
 * service key, the club is created by an admin-only function that re-checks
 * the role, and the password is shown once.
 *
 * One difference: if the number already has an account (a café owner who also
 * runs a salle), the club is attached to it and the password stays theirs —
 * a second login for the same person is a door that gets forgotten.
 */
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { abI18n } from "@/lib/abonili/i18n";

export type AbAdminResult = { ok: boolean; message: string; secret?: string; phone?: string; at: number };

export async function abAdminCreateClub(fd: FormData): Promise<AbAdminResult> {
  await requireAdmin();
  const { a, err } = abI18n(await getLocale());
  const at = Date.now();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const name = String(fd.get("name") ?? "").trim();
  const ownerName = String(fd.get("owner_name") ?? "").trim();
  const kind = String(fd.get("kind") ?? "gym");
  if (!phone) return { ok: false, message: err("invalid_phone"), at };
  if (name.length < 2) return { ok: false, message: err("invalid_name"), at };

  const service = createAdminClient();
  const password = "Abonili-" + randomBytes(4).toString("hex");
  let ownerId: string | null = null;
  let created = false;

  const { data: made, error } = await service.auth.admin.createUser({
    email: phoneAuthEmail(phone),
    password,
    email_confirm: true,
    app_metadata: { phone, full_name: ownerName },
  });
  if (made?.user) {
    ownerId = made.user.id;
    created = true;
  } else if (/already|registered|exists|duplicate/i.test(error?.message ?? "")) {
    const { data: existing } = await service.from("profiles").select("id").eq("phone", phone).maybeSingle();
    ownerId = (existing as { id: string } | null)?.id ?? null;
  }
  if (!ownerId) return { ok: false, message: err("network"), at };

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc("ab_admin_create_club", {
    p_owner: ownerId, p_name: name, p_kind: kind, p_owner_name: ownerName,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (rpcError || !res?.ok) {
    // never leave behind an account we just made and could not give a club
    if (created) await service.auth.admin.deleteUser(ownerId);
    return { ok: false, message: err(res?.error ?? "network"), at };
  }

  revalidatePath("/admin/abonili");
  return created
    ? { ok: true, message: a.admin.created, secret: password, phone: phone.replace(/^\+216/, ""), at }
    : { ok: true, message: a.admin.attached, phone: phone.replace(/^\+216/, ""), at };
}

/** Paid until / suspended: what the founder changes after he takes the money. */
export async function abAdminSetClub(id: string, status: "active" | "suspended", paidUntil: string | null): Promise<AbAdminResult> {
  await requireAdmin();
  const { a, err } = abI18n(await getLocale());
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ab_admin_set_club", { p_id: id, p_status: status, p_paid_until: paidUntil });
  const res = data as { ok: boolean; error?: string } | null;
  revalidatePath("/admin/abonili");
  if (error || !res?.ok) return { ok: false, message: err(res?.error ?? "network"), at: Date.now() };
  return { ok: true, message: a.admin.saved, at: Date.now() };
}
