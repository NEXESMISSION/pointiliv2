// Thin psql-ish helper and the shared connection for every script:
//   node scripts/db.mjs "select 1"
//
// WHICH DATABASE: DATABASE_URL (tampon-test) always, unless the caller passes
// BOTH --prod AND --i-know, in which case DATABASE_URL_PROD. --prod alone
// refuses. This is the whole reason v2 has a second Supabase project: the v1
// test database was production and the suites ran against real cafés.
import pg from "pg";
import { setDefaultResultOrder } from "node:dns";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/*
  Prefer IPv4 when resolving the database host. Supabase's pooler publishes
  IPv4 and NAT64 IPv6 addresses; Node will happily try an IPv6 one first,
  which fails with ENETUNREACH on a network without IPv6 egress and surfaces
  as a bare AggregateError with no hostname in it.
*/
setDefaultResultOrder("ipv4first");

export const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

export const PROD = process.argv.includes("--prod");

/**
 * The connection string this run is allowed to use. Never the production one
 * by accident: --prod must be accompanied by --i-know, and the host is said
 * out loud so a wrong target is visible before the first statement runs.
 */
export function dbUrl() {
  if (PROD) {
    if (!process.argv.includes("--i-know")) {
      console.error("\nREFUSING: --prod targets the LIVE database. If you really mean it:");
      console.error("  node scripts/<script>.mjs --prod --i-know\n");
      process.exit(1);
    }
    if (!env.DATABASE_URL_PROD) {
      console.error("\nDATABASE_URL_PROD is not set in .env.local\n");
      process.exit(1);
    }
    return env.DATABASE_URL_PROD;
  }
  if (!env.DATABASE_URL) {
    console.error("\nDATABASE_URL is not set in .env.local\n");
    process.exit(1);
  }
  return env.DATABASE_URL;
}

/** The host of a connection string, for logs. Never the password. */
export function dbHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable url)";
  }
}

/*
  Retried, because the first connection is the flakiest thing in a suite: the
  pooler drops or times out a TCP connect often enough that a run dies before
  its first assertion, and that looks exactly like a found bug. Six attempts,
  not three — a fixture opens several connections and every one has to win.
*/
export async function connect(attempts = 6) {
  const url = dbUrl();
  let last;
  for (let i = 1; i <= attempts; i++) {
    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      if (i > 1) console.error(`  (database connected on attempt ${i})`);
      return client;
    } catch (e) {
      last = e;
      // The failed client holds a socket and its own retry timers; without this
      // the process will not exit even once a later attempt succeeds.
      await client.end().catch(() => {});
      if (i < attempts) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  console.error(`  !! database unreachable after ${attempts} attempts (${dbHost(url)})`);
  throw last;
}

/*
  Teardown that survives a failure. Every suite cleans up on its last line,
  which is never reached when an assertion throws first. Anything registered
  here runs whichever way the suite ends — and never SILENTLY: a teardown that
  failed is printed, then the real error is thrown by the caller.
*/
const _teardown = [];
export const onExit = (fn) => _teardown.push(fn);
let _ran = false;
async function _sweep() {
  if (_ran) return;
  _ran = true;
  for (const fn of _teardown.reverse()) {
    try {
      await fn();
    } catch (e) {
      console.error("  ! teardown step failed:", e?.message ?? e);
    }
  }
}

/**
 * Delete a test owner account and PROVE it is gone. deleteUser() resolves with
 * { error } rather than throwing, so a bare await is a no-op on the flaky
 * failure it fails on. Retries, then verifies, then shouts by name.
 */
export async function deleteAccount(admin, id, label = id) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (!data?.user) return true;
    }
    if (attempt < 4) await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  console.error(
    `\n  !! COULD NOT DELETE TEST ACCOUNT ${label} (${id}).\n` +
      "     It is live and sign-in-able. Remove it by hand.",
  );
  return false;
}
process.on("unhandledRejection", async (e) => {
  console.error("\n--- suite failed, cleaning up ---");
  await _sweep();
  console.error(e);
  process.exit(1);
});
process.on("uncaughtException", async (e) => {
  console.error("\n--- suite crashed, cleaning up ---");
  await _sweep();
  console.error(e);
  process.exit(1);
});

/*
  The one-liner CLI — but ONLY when this file is what was run. Without the
  entry check, importing { env } from a script that takes its own arguments
  made this fire and try to execute argv[2] as SQL.
*/
const isEntry = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntry && process.argv[2] && !process.argv[2].startsWith("--")) {
  const c = await connect();
  const r = await c.query(process.argv[2]);
  console.table(r.rows);
  await c.end();
}
