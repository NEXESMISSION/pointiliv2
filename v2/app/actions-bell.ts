"use server";

import { revalidatePath } from "next/cache";
import { sendPush } from "@/lib/push";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";
import { BELL_ICONS } from "@/lib/bell";

/** The bell opened: what is in it is read (the badge goes; the dots stay on the page open now). */
export async function bellRead(): Promise<void> {
  await call("bell_read");
}

type Send = { title: string; body: string; icon: string; ctaLabel: string; ctaHref: string; to: string | null; push: boolean };

/**
 * The founder writes to the owners: to every shop, or to one owner by name (from the shop's page).
 * It is in their bell at once, pops up once on their home, and — asked — goes to their phones too
 * (the devices that said yes to notifications; a tap opens the bell).
 */
export async function adminNewsSend(x: Send): Promise<{ ok: boolean; error?: string; pushed?: number }> {
  const me = await getMe();
  if (!me?.admin) return { ok: false, error: "not_admin" };
  const title = x.title.trim();
  const body = x.body.trim();
  if (title.length < 2 || title.length > 80 || body.length > 400) return { ok: false, error: "invalid" };
  const icon = (BELL_ICONS as readonly string[]).includes(x.icon) ? x.icon : "sparkles";
  // a button needs both its words and where it goes: a place in the app, or a whole https address
  const label = x.ctaLabel.trim();
  const href = x.ctaHref.trim();
  const cta = label && href && (/^\/([^/\\]|$)/.test(href) || /^https:\/\//.test(href)) ? { label, href } : null;
  const to = x.to && /^[0-9a-f-]{36}$/i.test(x.to) ? x.to : null;
  const r = await call<{ ok: boolean; id?: string; error?: string }>("admin_news_save", {
    p_title: title,
    p_body: body,
    p_icon: icon,
    p_cta_label: cta?.label ?? null,
    p_cta_href: cta?.href ?? null,
    p_only: to ? [to] : null,
    p_steps: null,
  });
  if (!r?.ok || !r.id) return { ok: false, error: r?.error ?? "invalid" };
  let pushed = 0;
  if (x.push) {
    // who it is for: the one owner, or every owner whose shop opened before it (the founder's own and the tests left out)
    let people: string[] = to ? [to] : [];
    if (!to) {
      const { data } = await service().rpc("news_audience", { p_id: r.id });
      people = ((data ?? []) as { person_id: string; admin: boolean }[]).filter((a) => !a.admin).map((a) => a.person_id);
    }
    const note = { title, body: body.length > 140 ? `${body.slice(0, 137)}…` : body, url: "/shop/inbox", tag: `news-${r.id}` };
    // ten at a time: two hundred owners never wait on each other one by one
    for (let i = 0; i < people.length; i += 10) {
      const got = await Promise.all(people.slice(i, i + 10).map((id) => sendPush(id, note).catch(() => 0)));
      pushed += got.reduce((a, b) => a + b, 0);
    }
  }
  revalidatePath("/admin/news");
  return { ok: true, pushed };
}

/** Stopped, a piece of news leaves every bell (and never pops up); resumed, it is back. */
export async function adminNewsActive(id: string, on: boolean): Promise<boolean> {
  const r = await call<{ ok: boolean }>("admin_news_set_active", { p_id: id, p_active: on });
  revalidatePath("/admin/news");
  return !!r?.ok;
}

export async function adminNewsDelete(id: string): Promise<boolean> {
  const r = await call<{ ok: boolean }>("admin_news_delete", { p_id: id });
  revalidatePath("/admin/news");
  return !!r?.ok;
}
