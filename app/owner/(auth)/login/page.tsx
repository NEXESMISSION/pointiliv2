import Link from "next/link";
import { redirect } from "next/navigation";
import { currentOwner, ownerShop, supabaseConfigured } from "@/lib/auth/owner";
import { AuthForm } from "./AuthForm";
import { loginAction } from "./actions";

export const metadata = { title: "Connexion" };

/**
 * The owner's sign-in. French only: the owner app is one person's back office.
 *
 * THE TRAP: an already-signed-in owner is sent where they can actually LAND.
 * /owner is shop-gated, so an owner without one must go to setup — otherwise
 * the two pages bounce off each other forever.
 */
export default async function Login({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  const owner = await currentOwner();
  if (owner) redirect((await ownerShop()) ? "/owner" : "/owner/nouveau");
  const configured = supabaseConfigured();
  const { lien } = await searchParams;

  return (
    <div className="a-card px-6 py-7">
      <h1 className="text-[24px] font-extrabold leading-tight text-ink">Bon retour 👋</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate">
        Connectez-vous pour ouvrir votre écran et vos réglages.
      </p>

      {/* /auth/callback sends ?lien=expire here when a confirmation link has
          already been used or has run out. Rendered, so the click that "did
          nothing" gets an explanation. */}
      {lien === "expire" && (
        <p className="mt-4 rounded-xl bg-gold-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-gold">
          Ce lien de confirmation a expiré ou a déjà été utilisé. Connectez-vous ci-dessous — si le
          compte n&apos;est pas encore confirmé, créez-le à nouveau pour recevoir un nouveau lien.
        </p>
      )}

      {!configured && (
        <p className="mt-4 rounded-xl bg-gold-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-gold">
          Supabase n&apos;est pas encore configuré. En développement, l&apos;espace est accessible
          sans connexion —{" "}
          <Link href="/owner" className="font-bold underline">
            entrer directement
          </Link>
          .
        </p>
      )}

      <div className="mt-5">
        <AuthForm action={loginAction} cta="Se connecter" />
      </div>

      <p className="mt-5 text-center text-[13px] text-slate">
        Pas encore de compte ?{" "}
        <Link href="/owner/signup" className="font-bold text-royal">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
