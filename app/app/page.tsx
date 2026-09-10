import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CLIENT_COOKIE } from "@/lib/auth/client";
import { currentOwner, ownerHome } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";
/* Nothing to index: this route has no content of its own, it only decides. */
export const metadata = { robots: { index: false, follow: false } };

/**
 * ══ THE SWITCHBOARD ════════════════════════════════════════════════════════
 * What the INSTALLED app opens on. Renders nothing; works out who is holding
 * the phone and sends them where they belong:
 *
 *   owner session   the till, or setup, or the console (ownerHome decides)
 *   client cookie   the wallet
 *   nobody          the landing
 *
 * THE TRAP: the owner check is VERIFIED (currentOwner checks the signature
 * locally, no network for a visitor with no auth cookie). A name-only check
 * once sent a dead cookie to /owner → /owner/login on every launch, forever.
 * The client check is presence-only on purpose: /moi verifies the cookie
 * itself and shows "Récupère ta carte" for a forged or dead one, which is the
 * right screen for that visitor anyway.
 */
export default async function AppEntry() {
  const owner = await currentOwner();
  if (owner) redirect(await ownerHome());
  const jar = await cookies();
  if (jar.get(CLIENT_COOKIE)?.value) redirect("/moi");
  redirect("/");
}
