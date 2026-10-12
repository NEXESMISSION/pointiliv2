import type { ReactNode } from "react";
import { PhoneCheck } from "@/components/PhoneCheck";
import { getMe } from "@/lib/session";

/**
 * Every owner screen. One thing sits over all of them when it must: the
 * founder asked for the owner's real number (the one they signed up with is
 * not theirs), and nothing goes on until it is given.
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  return (
    <>
      {children}
      {me?.phone_check === "ask" && <PhoneCheck />}
    </>
  );
}
