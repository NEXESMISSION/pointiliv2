import { redirect } from "next/navigation";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ownerAccess, ownerHome, ownerShop } from "@/lib/auth/owner";

export const metadata = { title: "Mon écran" };

/**
 * Never prerender the owner app: every page here reads live, per-owner data.
 * Without this the dev-bypass path (which reads no cookies) would let Next
 * statically cache a page at build time and serve frozen numbers.
 */
export const dynamic = "force-dynamic";

/**
 * The guard over every owner screen: signed in, AND owns a shop. The shell
 * itself is deliberately bare — the till (owner-ui) decides its own chrome,
 * because a screen left face-up on a stand for ten hours wants nothing on it
 * but the QR.
 *
 * THE TRAP: the redirect happens HERE, above any loading boundary. A redirect
 * thrown from a page after a loading.tsx has streamed cannot be an HTTP 307
 * any more — Next emits a <meta refresh> and the owner's first screen is a
 * spinner, a dead second, then a reload.
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await ownerAccess();
  if (!owner) redirect("/owner/login");

  const shop = await ownerShop();
  if (!shop) redirect(await ownerHome());

  return (
    <div className="a-shell flex min-h-dvh flex-col">
      {owner.dev && (
        <p className="border-b border-[var(--o-edge)] bg-gold-soft px-5 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-gold">
          ⚠ Mode développement — aucune authentification
        </p>
      )}
      <main className="flex flex-1 flex-col">{children}</main>
      {/* the till is opened once a shift, on one phone, and stays open */}
      <InstallPrompt audience="owner" />
    </div>
  );
}
