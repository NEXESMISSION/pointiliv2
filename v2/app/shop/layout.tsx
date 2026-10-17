import type { ReactNode } from "react";
import { MorphGround } from "@/components/Morph";
import { PhoneCheck } from "@/components/PhoneCheck";
import { getMe } from "@/lib/session";

/**
 * Every owner screen. One thing sits over all of them when it must: the
 * founder asked for the owner's real number (the one they signed up with is
 * not theirs), and nothing goes on until it is given. Under them all, the
 * one ground of the owner's screens (components/Owner.tsx says the rest of
 * the look): the counter and the camera paint their own over it.
 */
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  return (
    <>
      <MorphGround />
      {children}
      {me?.phone_check === "ask" && <PhoneCheck />}
    </>
  );
}
