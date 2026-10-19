import { redirect } from "next/navigation";

export const metadata = { robots: { index: false } };

/**
 * The customer's app was built again here, beside the live one, so the two
 * could be opened on the same phone and compared (the founder, 18 Oct 2026).
 * It won, and on 19 Oct it moved over the old one — so this is home now.
 *
 * The page stays as a door rather than a 404: it is on the founder's phone,
 * and probably on a tester's.
 */
export default function Moved() {
  redirect("/");
}
