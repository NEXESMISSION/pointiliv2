/**
 * One query on this computer's database, as the database's owner (the founder's SQL door):
 *   node sql.mjs "select count(*) from public.shops"
 */
import { SERVICE_KEY } from "./keys.mjs";

const res = await fetch(`http://127.0.0.1:${process.env.LOCALBASE_PORT || 54321}/local/sql`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: process.argv[2] ?? "" }),
});
console.log(res.status, await res.text());
