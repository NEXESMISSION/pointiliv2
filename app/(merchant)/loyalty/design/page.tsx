import { redirect } from "next/navigation";

/** The look is designed on the card page itself now; old links still arrive there. */
export default function DesignPage() {
  redirect("/loyalty");
}
