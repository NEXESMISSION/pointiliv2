import type { Locale } from "../config";
import { admin } from "./admin";
import { auth } from "./auth";
import { common } from "./common";
import { customer } from "./customer";
import { data } from "./data";
import { errors } from "./errors";
import { formats } from "./formats";
import { marketing } from "./marketing";
import { merchant } from "./merchant";
import { nav } from "./nav";
import { ops } from "./ops";
import { scan } from "./scan";

/** One namespace per area. French defines the shape; Tunisian must match it. */
const NAMESPACES = { common, errors, formats, data, nav, marketing, auth, customer, scan, merchant, ops, admin };

export type Messages = { [K in keyof typeof NAMESPACES]: (typeof NAMESPACES)[K]["fr"] };

const BUILT = new Map<Locale, Messages>();

export function messagesFor(locale: Locale): Messages {
  let built = BUILT.get(locale);
  if (!built) {
    built = Object.fromEntries(Object.entries(NAMESPACES).map(([key, value]) => [key, value[locale]])) as Messages;
    BUILT.set(locale, built);
  }
  return built;
}
