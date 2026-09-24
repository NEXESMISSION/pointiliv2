import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";

/** An old address from posts and links: it lands on the front door. */
export default async function OldPage() {
  const { path } = await getI18n();
  redirect(path("/") || "/");
}
