import { redirect } from "next/navigation";

/** The plan lives on the settings page now. Old links, bookmarks and the
 *  installed PWA's cached shell still point here, so this stays as a door. */
export default function BillingMoved() {
  redirect("/settings");
}
