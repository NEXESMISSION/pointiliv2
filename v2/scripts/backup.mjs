/**
 * A copy of everything, kept on this computer — the free plan keeps none of
 * its own (the founder, 24 Oct 2026: «a local thing that runs every day or
 * three, to save the data and make a nice clean backup»).
 *
 * One zip a day in «Desktop/Pointili Backups», named by its day:
 *   - pointili.dump — the database as pg_dump writes it (custom format):
 *     every table of the app and its rows, the accounts with their
 *     passwords (auth), and the list of stored files (storage);
 *   - logos/ — the shops' logos, the files themselves;
 *   - voices/ — the founder's voice notes, still sealed (lib/voice.ts): the
 *     zip alone never plays them, only with VOICE_KEY;
 *   - summary.txt — what is in it: each table and its rows, the sizes.
 * The dump is read back before the zip is kept. The last 60 days are kept
 * whole; before that, the first copy of each month. A line per copy in
 * backups.log; a copy that fails says why there, and on Telegram.
 *
 * Windows runs it (the task «Pointili backup», scripts/backup-task.ps1)
 * every day at 13:00 and at logon. A day that already has its copy is
 * skipped, so the two never make two.
 *
 *   node scripts/backup.mjs            (from anywhere; reads v2/.env.local)
 *   node scripts/backup.mjs --force    (even when today's copy is there)
 *   node scripts/backup.mjs --dry-alert  (a failure's Telegram word printed, not sent)
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const V2 = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(V2, ".env.local"), quiet: true });
const env = process.env;
const FORCE = process.argv.includes("--force");
const DRY_ALERT = process.argv.includes("--dry-alert");

const OUT = env.BACKUP_DIR || join(homedir(), "Desktop", "Pointili Backups");
const LOG = join(OUT, "backups.log");
const KEEP_DAYS = 60;
const PG_BIN = [env.PG_BIN, join(homedir(), "scoop", "apps", "postgresql", "current", "bin")].find((d) => d && existsSync(join(d, "pg_dump.exe")));
const bin = (name) => (PG_BIN ? join(PG_BIN, `${name}.exe`) : name);
const REF = env.SUPABASE_PROJECT_REF;
const t0 = Date.now();

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}h${pad(d.getMinutes())}`;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const log = (line) => appendFileSync(LOG, `${stamp(new Date())}  ${line}\n`);
/** the copies already kept, oldest first: «Pointili 2026-10-24 13h00.zip» */
const copies = () =>
  existsSync(OUT)
    ? readdirSync(OUT)
        .map((name) => ({ name, m: /^Pointili (\d{4})-(\d{2})-(\d{2}) (\d{2})h(\d{2})\.zip$/.exec(name) }))
        .filter((x) => x.m)
        .map(({ name, m }) => ({ name, at: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) }))
        .sort((a, b) => a.at - b.at)
    : [];

/** pg_dump, pg_restore and psql, given the password by the environment (never on the command line) */
function run(cmd, args, pgEnv) {
  const r = spawnSync(cmd, args, { env: { ...env, ...pgEnv }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd.split(/[\\/]/).pop()}: ${(r.stderr || r.stdout || `exit ${r.status}`).trim().split("\n").slice(-3).join(" / ").slice(0, 300)}`);
  return r.stdout;
}

/** The pooler's address, as Supabase gives it now (it moved once, from aws-0 to aws-1); its session port takes a dump. */
async function poolerHost() {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/database/pooler`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(15000) });
    const list = await res.json();
    const host = Array.isArray(list) ? list.find((x) => x.database_type === "PRIMARY")?.db_host : null;
    if (host) return host;
  } catch {
    /* the address it had */
  }
  return "aws-1-eu-west-1.pooler.supabase.com";
}

/** A bucket, file by file (a folder in it is listed in its turn): the logos, the sealed voice notes. */
async function bucket(name, dir) {
  const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
  let files = 0;
  let bytes = 0;
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += 1000) {
      const res = await fetch(`${base}/object/list/${name}`, { method: "POST", headers, body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }), signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`${name} list: HTTP ${res.status}`);
      const items = await res.json();
      for (const it of items) {
        const path = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id === null) {
          await walk(path);
          continue;
        }
        const file = await fetch(`${base}/object/${name}/${path.split("/").map(encodeURIComponent).join("/")}`, { headers, signal: AbortSignal.timeout(30000) });
        if (!file.ok) throw new Error(`${name} ${path}: HTTP ${file.status}`);
        const buf = Buffer.from(await file.arrayBuffer());
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), buf);
        files++;
        bytes += buf.length;
      }
      if (items.length < 1000) break;
    }
  };
  await walk("");
  return { files, bytes };
}

/** A word on the founder's phone when a copy fails (the bot of lib/telegram.ts). */
async function alert(why) {
  const last = copies().pop();
  const text = `⚠️ <b>النسخة الاحتياطية متاع Pointili ما تعملتش</b>\n${why.replace(/[<>&]/g, "")}\n\nآخر نسخة باهية: ${last ? stamp(last.at) : "حتى وحدة"}\nالدوسي: Desktop › Pointili Backups › backups.log`;
  if (DRY_ALERT) return console.log(`[telegram, not sent]\n${text}`);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}

const README = `POINTILI BACKUPS
================

One zip a day, made by this computer (Windows task «Pointili backup»: every
day at 13:00, and at logon if the day has no copy yet). The script is
v2/scripts/backup.mjs in the Pointili repository; backups.log has a line for
every copy, and says why when one failed (a word comes on Telegram too).

Kept: every copy of the last ${KEEP_DAYS} days, then the first copy of each month.

IN EACH ZIP
  pointili.dump   the database (pg_dump, custom format): the app's tables
                  (schema public), the accounts and their passwords (auth),
                  the list of stored files (storage)
  logos/          the shops' logos (the «logos» bucket)
  voices/         the founder's voice notes, SEALED (the private «voices» bucket):
                  they open only with VOICE_KEY, which is NOT in the zip — keep
                  a copy of it somewhere safe, apart from these zips
  summary.txt     each table with its number of rows, the sizes

SEE WHAT IS INSIDE (PostgreSQL's tools: scoop install postgresql)
  pg_restore --list pointili.dump
  pg_restore --data-only -t shops -f shops.sql pointili.dump    (one table, as SQL)

PUT IT BACK, in a NEW, EMPTY Supabase project (never over the live one)
  1. The tables, functions and rules: in v2/.env.local put the new project's
     ref and keys, then: npm run db        (it lays v2/supabase/schema.sql)
  2. The accounts first, then the rows (DB_URL = the new project's session
     pooler URL, port 5432, from Settings > Database):
       pg_restore --data-only --no-owner -n auth   -d "DB_URL" pointili.dump
       pg_restore --data-only --no-owner --disable-triggers -n public -d "DB_URL" pointili.dump
  3. The logos: upload the logos/ folder into the new «logos» bucket; the
     voices/ folder into the new PRIVATE «voices» bucket (npm run db makes it),
     with the same VOICE_KEY in Vercel's environment.
  4. Point Vercel's environment at the new project.
`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "README.txt"), README.replace(/\n/g, "\r\n"));
  const last = copies().pop();
  if (!FORCE && last && Date.now() - last.at.getTime() < 20 * 3600_000) {
    console.log(`today's copy is there: ${last.name}`);
    return;
  }
  for (const k of ["SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) if (!env[k]) throw new Error(`${k} missing in v2/.env.local`);

  const now = new Date();
  const name = `Pointili ${stamp(now)}`;
  const work = join(tmpdir(), `pointili-backup-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  try {
    const host = await poolerHost();
    const pg = { PGHOST: host, PGPORT: "5432", PGUSER: `postgres.${REF}`, PGDATABASE: "postgres", PGPASSWORD: env.SUPABASE_DB_PASSWORD, PGSSLMODE: "require", PGCONNECT_TIMEOUT: "20" };

    // the dump, tried three times (a phone network drops)
    const dump = join(work, "pointili.dump");
    for (let attempt = 1; ; attempt++) {
      try {
        run(bin("pg_dump"), ["--format=custom", "--compress=9", "--schema=public", "--schema=auth", "--schema=storage", `--file=${dump}`], pg);
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 30_000 * attempt));
      }
    }
    // read back: a dump that cannot be listed is no copy
    const tables = (run(bin("pg_restore"), ["--list", dump], {}).match(/ TABLE DATA /g) ?? []).length;
    if (tables < 10) throw new Error(`the dump holds only ${tables} tables`);

    // what is in it: every table of the app and its rows, the accounts, the stored files
    const counts = run(
      bin("psql"),
      [
        "--no-psqlrc",
        "--tuples-only",
        "--no-align",
        "--field-separator=\t",
        "--command",
        `select s.n || '.' || s.t, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', s.n, s.t), false, true, '')))[1]::text
         from (select table_schema n, table_name t from information_schema.tables
               where table_type = 'BASE TABLE' and (table_schema = 'public' or (table_schema, table_name) in (('auth', 'users'), ('storage', 'objects')))) s
         order by s.n <> 'public', 1;
         select 'database size', pg_size_pretty(pg_database_size(current_database()));`,
      ],
      pg,
    )
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split("\t"));
    const rows = Object.fromEntries(counts);

    const pics = await bucket("logos", join(work, "logos"));
    const voices = await bucket("voices", join(work, "voices"));
    const dumpSize = statSync(dump).size;
    const width = Math.max(...counts.map(([k]) => k.length));
    writeFileSync(
      join(work, "summary.txt"),
      [
        `Pointili — backup of ${stamp(now)}`,
        `Supabase project ${REF}, through ${host}`,
        "",
        `pointili.dump  ${mb(dumpSize)}  (${tables} tables with their rows)`,
        `logos/         ${pics.files} files, ${mb(pics.bytes)}`,
        `voices/        ${voices.files} files, ${mb(voices.bytes)} (sealed: they open only with VOICE_KEY)`,
        `database size  ${rows["database size"] ?? "?"}`,
        "",
        "TABLE".padEnd(width) + "  ROWS",
        ...counts.filter(([k]) => k !== "database size").map(([k, v]) => `${k.padEnd(width)}  ${v}`),
        "",
        "How to look inside or put it back: README.txt next to the zips.",
      ].join("\r\n"),
    );

    // the zip: written under another name, then renamed — a half-written zip never looks like a copy
    const part = join(OUT, `${name}.zip.partial`);
    rmSync(part, { force: true });
    run(join(env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), ["--format", "zip", "-c", "-f", part, "-C", work, "pointili.dump", "summary.txt", ...(pics.files ? ["logos"] : []), ...(voices.files ? ["voices"] : [])], {});
    renameSync(part, join(OUT, `${name}.zip`));
    const zipSize = statSync(join(OUT, `${name}.zip`)).size;

    // the old ones: the last 60 days whole, then the first copy of each month
    const cut = Date.now() - KEEP_DAYS * 24 * 3600_000;
    const months = new Set();
    let gone = 0;
    for (const c of copies()) {
      const month = `${c.at.getFullYear()}-${c.at.getMonth()}`;
      const firstOfMonth = !months.has(month);
      months.add(month);
      if (c.at.getTime() >= cut || firstOfMonth) continue;
      rmSync(join(OUT, c.name));
      gone++;
    }

    const secs = Math.round((Date.now() - t0) / 1000);
    log(`ok      ${mb(zipSize).padStart(8)}  ${rows["public.shops"] ?? "?"} shops · ${rows["auth.users"] ?? "?"} accounts · ${rows["public.moments"] ?? "?"} moments · ${pics.files} logos · ${secs}s${gone ? ` · ${gone} old removed` : ""}`);
    console.log(`✓ ${name}.zip — ${mb(zipSize)}, ${tables} tables, ${pics.files} logos, ${secs}s`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (e) {
  // the password never in a log or a message, whatever a tool said
  const why = env.SUPABASE_DB_PASSWORD ? String(e?.message ?? e).split(env.SUPABASE_DB_PASSWORD).join("***") : String(e?.message ?? e);
  try {
    mkdirSync(OUT, { recursive: true });
    log(`FAILED  ${why}`);
  } catch {
    /* nowhere to write it */
  }
  console.error(`✗ ${why}`);
  await alert(why);
  process.exit(1);
}
