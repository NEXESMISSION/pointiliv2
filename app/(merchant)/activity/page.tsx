import { redirect } from "next/navigation";

/** The log lives inside the customers page now: today's group is today's activity. */
export default function ActivityPage() {
  redirect("/customers");
}
