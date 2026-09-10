"use server";

import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/auth/owner";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign in, sign up, sign out — the three owner actions, ported from v1.
 *
 * THE TRAP: Supabase speaks English and the people using this do not.
 * inFrench() maps the SHAPE of the library's message (these strings change
 * between releases) so a missed variant degrades to a French sentence, not to
 * "User already registered" in front of a café owner.
 */

export type AuthState = {
  error?: string;
  notice?: string;
  /** What they typed, so a rejected form does not make them type it again. */
  email?: string;
  /** Set when the address already has an account — the form offers the door. */
  signIn?: true;
};

function inFrench(message: string): { error: string; signIn?: true } {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return { error: "Cette adresse a déjà un compte.", signIn: true };
  }
  if (m.includes("password") && (m.includes("least") || m.includes("short"))) {
    return { error: "Mot de passe : 8 caractères minimum." };
  }
  if (m.includes("invalid format") || m.includes("validate email")) {
    return { error: "Cette adresse e-mail n'est pas valide." };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  /* Anything unmapped: say what happened without repeating English at them. */
  return { error: "La création du compte a échoué. Réessayez dans un instant." };
}

function readCreds(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: "Supabase n'est pas configuré (voir .env.local)." };
  }
  const { email, password } = readCreds(formData);
  if (!email || !password) return { error: "E-mail et mot de passe requis.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Vague on purpose — do not reveal which accounts exist.
  if (error) return { error: "E-mail ou mot de passe incorrect.", email };

  /* Straight to the right screen: a server-action redirect is a client
     navigation, and chaining it through "/" left a new owner parked on an
     empty page when the second hop never committed. */
  const { ownerHome } = await import("@/lib/auth/owner");
  redirect(await ownerHome());
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { error: "Supabase n'est pas configuré (voir .env.local)." };
  }
  const { email, password } = readCreds(formData);
  if (!email || !password) return { error: "E-mail et mot de passe requis.", email };
  if (password.length < 8) {
    return { error: "Mot de passe : 8 caractères minimum.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { ...inFrench(error.message), email };

  return {
    notice: "Compte créé. Vérifie tes e-mails pour confirmer ton adresse.",
    email,
  };
}

export async function logoutAction() {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  /* The sign-in screen, not "/": someone who just signed out wants to sign
     back in — and a client cookie on a shared phone must never be what "/"
     decides on. */
  redirect("/owner/login");
}
