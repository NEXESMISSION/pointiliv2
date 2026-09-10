import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/BrandMark";
import { logoutAction } from "../(auth)/login/actions";
import { ownerAccess } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

/**
 * Setup shell — authenticated, but NOT shop-gated. /owner/nouveau lives here.
 *
 * THE TRAP: this group exists to break a redirect loop. An owner with no shop
 * used to bounce /owner → /owner/login → /owner forever with no way to reach
 * a logout. No shop requirement here, so it is always a reachable destination,
 * and the logout is always on screen.
 */
export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const owner = await ownerAccess();
  if (!owner) redirect("/owner/login");

  return (
    <div className="a-shell flex min-h-dvh flex-col px-6 py-8">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        <div className="flex items-center justify-between">
          <BrandLockup size={28} accent="#5b3fd1" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate underline underline-offset-2"
            >
              Se déconnecter
            </button>
          </form>
        </div>
        <div className="flex flex-1 flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}
