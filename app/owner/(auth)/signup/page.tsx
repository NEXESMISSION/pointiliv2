import Link from "next/link";
import { redirect } from "next/navigation";
import { currentOwner, ownerShop } from "@/lib/auth/owner";
import { AuthForm } from "../login/AuthForm";
import { signupAction } from "../login/actions";

export const metadata = { title: "Créer mon compte" };

/**
 * Create an owner account. Open from day one: the trial is 14 days by
 * platform_settings and the console (admin) is where a shop gets extended, so
 * there is no "trial we cannot let them finish" gate here as v1 had.
 *
 * THE TRAP: same bounce as login — a signed-in owner never sees this form.
 */
export default async function Signup() {
  const owner = await currentOwner();
  if (owner) redirect((await ownerShop()) ? "/owner" : "/owner/nouveau");

  return (
    <div className="a-card px-6 py-7">
      <h1 className="text-[24px] font-extrabold leading-tight text-ink">Créez votre compte</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate">
        Quelques secondes, et vos clients peuvent scanner.
      </p>

      <p className="mt-4 rounded-xl bg-[var(--o-inset)] px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-royal">
        ✦ 14 jours gratuits — sans carte bancaire.
      </p>

      <div className="mt-5">
        <AuthForm
          action={signupAction}
          cta="Créer mon compte"
          passwordAutoComplete="new-password"
          passwordHint="8 caractères minimum."
        />
      </div>

      <p className="mt-5 text-center text-[13px] text-slate">
        Déjà un compte ?{" "}
        <Link href="/owner/login" className="font-bold text-royal">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
