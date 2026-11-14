/**
 * The founder's own account on this computer's database: an admin who is not a robot (the scripts that
 * act «as the founder» look for one). Its number and password are in localbase/.data-logins.txt — this
 * computer only.
 *   node founder.mjs           (from localbase/, with the database running)
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { SERVICE_KEY } from "./keys.mjs";

const URL_ = `http://127.0.0.1:${process.env.LOCALBASE_PORT || 54321}`;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const LOGINS = new URL("./.data/../.data-logins.txt", import.meta.url);
const phone = "20000001";
const password = "founder-local-1";
const email = `216${phone}@phone.pointidi.app`;
let res = await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { phone: `+216${phone}` } }) });
let user = await res.json();
if (!res.ok && user.code === "email_exists") {
  const list = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json();
  user = list.users.find((u) => u.email === email);
}
await fetch(`${URL_}/rest/v1/people?on_conflict=id`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: user.id, name: "Founder (local)", phone: `+216${phone}`, is_admin: true }) });
const line = `founder  ${phone}  ${password}\n`;
if (!existsSync(LOGINS) || !readFileSync(LOGINS, "utf8").includes(line)) appendFileSync(LOGINS, line);
console.log("founder:", user.id);
