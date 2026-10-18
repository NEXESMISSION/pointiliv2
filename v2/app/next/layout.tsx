export const metadata = { robots: { index: false } };

/**
 * The customer's app, built again from nothing (the founder, 18 Oct 2026: «i
 * really dont like how the client pages look, all of them… lets do something
 * totally different on the side, and when we are done with it we can do the
 * main change»).
 *
 * It lives beside the live one, on the same data, so the two can be opened on
 * the same phone and compared. Nothing here is linked to from the app: the
 * founder opens /next himself. If it wins, these files move over the old ones;
 * if it does not, deleting this folder costs nothing.
 *
 * What the numbers said before a line was drawn (views and taps, 18 Oct):
 *  - /c/[id]: 150 dead taps out of 556 — a quarter of everything done on a
 *    card page reaches for something that is not there, and they land on the
 *    card itself and the empty half under it.
 *  - /scan: 42 dead of 111.
 *  - /login: 1287 taps for 1098 views, on a page with two fields.
 * So the card is made the button here, and the thing a customer came to do is
 * never more than one tap from where they are.
 */
export default function NextLayout({ children }: { children: React.ReactNode }) {
  return children;
}
