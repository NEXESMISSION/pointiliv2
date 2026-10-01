import { redirect } from "next/navigation";

/** The settings live on the owner's home now. */
export default function ShopSettings() {
  redirect("/shop");
}
