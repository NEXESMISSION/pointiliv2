/**
 * Pointili's database on this computer: Postgres (PGlite) with what the app asks of Supabase in front —
 * the REST calls (functions and the few tables the server reads), the sign-in, the founder's SQL — on
 * http://127.0.0.1:54321. The app and the scripts point at it through their .env.local (localbase/env.local
 * says what to put there), and then nothing they do can reach the live database: they do not even hold its
 * keys.
 *
 *   node server.mjs            the database as it was left (made on the first run)
 *   node server.mjs --reset    a new, empty database: prelude.sql, then schema.sql and the files after it
 *
 * Realtime (the counter's radio) and Storage (logos, voice notes) are not served: the app falls back on
 * its own (the counter asks every few seconds; a logo cannot be uploaded here).
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { sign, verify } from "./keys.mjs";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const V2 = join(HERE, "..", "v2");
const PORT = Number(process.env.LOCALBASE_PORT || 54321);
const DATA = join(HERE, ".data");
// the schema, in the order db.mjs lays it (schema.sql, then the files that come after it)
const FILES = ["supabase/schema.sql", "supabase/systems-2026-11-08.sql", "supabase/packs-2026-11-09.sql"];

const hashPassword = (p) => {
  const salt = randomBytes(12).toString("hex");
  return `scrypt$${salt}$${scryptSync(String(p), salt, 32).toString("hex")}`;
};
const passwordOk = (p, stored) => {
  const [kind, salt, hash] = String(stored ?? "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = scryptSync(String(p), salt, 32);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
};

// ─── the database ──────────────────────────────────────────────────────────
const reset = process.argv.includes("--reset");
if (reset && existsSync(DATA)) rmSync(DATA, { recursive: true, force: true });
const fresh = !existsSync(DATA);
const db = new PGlite(DATA, { extensions: { pgcrypto } });
await db.waitReady;
if (fresh) {
  const t0 = Date.now();
  await db.exec(readFileSync(join(HERE, "prelude.sql"), "utf8"));
  // a fresh database: schema.sql's functions name columns it adds further down (as on the live one, where
  // they are there already) — so its bodies are checked when they run; every file after it, strictly, as
  // the live database will check them
  for (const f of FILES) {
    if (!existsSync(join(V2, f))) continue;
    await db.exec(`set check_function_bodies = ${f.endsWith("schema.sql") ? "off" : "on"};`);
    await db.exec(readFileSync(join(V2, f), "utf8"));
  }
  await db.exec("set check_function_bodies = on;");
  console.log(`localbase: a new database, ${FILES.filter((f) => existsSync(join(V2, f))).join(" + ")} (${Date.now() - t0} ms)`);
}

// one request at a time: PGlite has one connection, and a request's settings must never leak into another's
let queue = Promise.resolve();
const serial = (fn) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

/** run `work` as the caller: the API role of their key, their JWT claims for auth.uid() */
async function as(claims, work) {
  return serial(() =>
    db.transaction(async (tx) => {
      const role = claims?.role === "service_role" ? "service_role" : claims?.role === "authenticated" ? "authenticated" : "anon";
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims ?? { role: "anon" })]);
      await tx.exec(`set local role ${role}`);
      return work(tx);
    }),
  );
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const q = (id) => {
  if (!IDENT.test(id)) throw httpError(400, "PGRST100", `bad name: ${id}`);
  return `"${id}"`;
};
function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, body: { code, message, details: null, hint: null } });
}
function pgError(e) {
  const code = e?.code ?? "XX000";
  const status = code === "42501" ? 403 : code === "42883" || code === "42P01" ? 404 : code.startsWith("23") ? 409 : 400;
  return Object.assign(new Error(e.message), { status, body: { code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null } });
}

// ─── REST: functions ───────────────────────────────────────────────────────
async function rpc(fn, args, claims) {
  if (!IDENT.test(fn)) throw httpError(404, "PGRST202", `no function ${fn}`);
  const procs = await serial(() =>
    db.query(
      `select p.proname, p.proretset, coalesce(p.proargnames, '{}') as names, p.pronargs, p.pronargdefaults,
              array(select format_type(t, null) from unnest(p.proargtypes) t) as types,
              array(select (select typcategory from pg_type where oid = t) from unnest(p.proargtypes) t) as cats,
              format_type(p.prorettype, null) as rettype
       from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`,
      [fn],
    ),
  );
  const keys = Object.keys(args ?? {});
  const pick = procs.rows.find((p) => {
    const names = p.names.slice(0, p.pronargs);
    const required = names.slice(0, p.pronargs - p.pronargdefaults);
    return keys.every((k) => names.includes(k)) && required.every((r) => keys.includes(r));
  });
  if (!pick) throw httpError(404, "PGRST202", `Could not find the function public.${fn}(${keys.join(", ")})`);
  const params = [];
  const parts = keys.map((k) => {
    const i = pick.names.indexOf(k);
    const type = pick.types[i];
    params.push(JSON.stringify(args[k] ?? null));
    const n = params.length;
    if (type === "jsonb" || type === "json") return `${q(k)} => $${n}::${type}`;
    if (pick.cats[i] === "A") return `${q(k)} => (select array_agg(e) from jsonb_array_elements_text($${n}::jsonb) e)::${type}`;
    return `${q(k)} => ($${n}::jsonb #>> '{}')::${type}`;
  });
  const call = `public.${q(fn)}(${parts.join(", ")})`;
  const sql = pick.proretset ? `select coalesce(json_agg(t), '[]'::json) as r from ${call} t` : `select to_jsonb(${call}) as r`;
  try {
    const res = await as(claims, (tx) => tx.query(sql, params));
    return res.rows[0]?.r ?? null;
  } catch (e) {
    throw pgError(e);
  }
}

// ─── REST: tables (the few the server reads and writes itself) ────────────────
function parseFilter(col, raw, params) {
  let neg = false;
  let v = raw;
  if (v.startsWith("not.")) {
    neg = true;
    v = v.slice(4);
  }
  const dot = v.indexOf(".");
  const op = v.slice(0, dot);
  const val = v.slice(dot + 1);
  const c = q(col);
  let sql;
  const p = (x) => {
    params.push(x);
    return `$${params.length}`;
  };
  switch (op) {
    case "eq": sql = `${c} = ${p(val)}`; break;
    case "neq": sql = `${c} <> ${p(val)}`; break;
    case "gt": sql = `${c} > ${p(val)}`; break;
    case "gte": sql = `${c} >= ${p(val)}`; break;
    case "lt": sql = `${c} < ${p(val)}`; break;
    case "lte": sql = `${c} <= ${p(val)}`; break;
    case "like": sql = `${c}::text like ${p(val.replace(/\*/g, "%"))}`; break;
    case "ilike": sql = `${c}::text ilike ${p(val.replace(/\*/g, "%"))}`; break;
    case "is": sql = `${c} is ${val === "null" ? "null" : val === "true" ? "true" : val === "false" ? "false" : "unknown"}`; break;
    case "in": {
      const items = val.replace(/^\(|\)$/g, "").match(/("([^"\\]|\\.)*"|[^,]+)/g) ?? [];
      sql = items.length ? `${c} in (${items.map((x) => p(x.startsWith('"') ? JSON.parse(x) : x)).join(", ")})` : "false";
      break;
    }
    default: throw httpError(400, "PGRST100", `operator ${op} not served here`);
  }
  return neg ? `not (${sql})` : sql;
}
function whereOf(url, params) {
  const conds = [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (k === "or") {
      const inner = v.replace(/^\(|\)$/g, "").split(",");
      conds.push(`(${inner.map((x) => { const i = x.indexOf("."); return parseFilter(x.slice(0, i), x.slice(i + 1), params); }).join(" or ")})`);
    } else conds.push(parseFilter(k, v, params));
  }
  return conds.length ? ` where ${conds.join(" and ")}` : "";
}
const colsOf = (url) => {
  const s = (url.searchParams.get("select") ?? "*").replace(/\s+/g, "");
  return s === "*" ? "*" : s.split(",").filter(Boolean).map(q).join(", ");
};
async function table(req, url, name, claims, body) {
  const t = `public.${q(name)}`;
  const prefer = String(req.headers["prefer"] ?? "");
  const params = [];
  const run = (sql, ps) => as(claims, (tx) => tx.query(sql, ps)).catch((e) => { throw pgError(e); });
  const out = (rows) => (String(req.headers["accept"] ?? "").includes("vnd.pgrst.object") ? one(rows) : rows);
  const one = (rows) => {
    if (rows.length !== 1) throw httpError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
    return rows[0];
  };
  const returning = /return=representation/.test(prefer);
  if (req.method === "GET" || req.method === "HEAD") {
    const where = whereOf(url, params);
    let order = "";
    if (url.searchParams.get("order")) {
      order = " order by " + url.searchParams.get("order").split(",").map((o) => {
        const [col, dir, nulls] = o.split(".");
        return `${q(col)} ${dir === "desc" ? "desc" : "asc"}${nulls === "nullsfirst" ? " nulls first" : nulls === "nullslast" ? " nulls last" : ""}`;
      }).join(", ");
    }
    const limit = url.searchParams.get("limit") ? ` limit ${Number(url.searchParams.get("limit"))}` : "";
    const offset = url.searchParams.get("offset") ? ` offset ${Number(url.searchParams.get("offset"))}` : "";
    const rows = req.method === "HEAD" ? [] : (await run(`select coalesce(json_agg(t), '[]'::json) as r from (select ${colsOf(url)} from ${t}${where}${order}${limit}${offset}) t`, params)).rows[0].r;
    let range = null;
    if (/count=exact/.test(prefer)) {
      const n = Number((await run(`select count(*)::int as n from ${t}${where}`, params)).rows[0].n);
      range = `${rows.length ? `0-${rows.length - 1}` : "*"}/${n}`;
    }
    return { body: req.method === "HEAD" ? null : out(rows), range };
  }
  if (req.method === "POST") {
    const list = Array.isArray(body) ? body : [body];
    if (!list.length) return { body: [] };
    const cols = [...new Set(list.flatMap((x) => Object.keys(x)))];
    let conflict = "";
    if (/resolution=(merge|ignore)-duplicates/.test(prefer)) {
      let keys = url.searchParams.get("on_conflict")?.split(",");
      if (!keys) {
        const pk = await run(`select a.attname as c from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = '${t}'::regclass and i.indisprimary`, []);
        keys = pk.rows.map((r) => r.c);
      }
      conflict = /ignore-duplicates/.test(prefer)
        ? ` on conflict (${keys.map(q).join(", ")}) do nothing`
        : ` on conflict (${keys.map(q).join(", ")}) do update set ${cols.filter((c) => !keys.includes(c)).map((c) => `${q(c)} = excluded.${q(c)}`).join(", ") || `${q(keys[0])} = excluded.${q(keys[0])}`}`;
    }
    params.push(JSON.stringify(list));
    const sql = `with ins as (insert into ${t} (${cols.map(q).join(", ")}) select ${cols.map(q).join(", ")} from json_populate_recordset(null::${t}, $1::json)${conflict} returning *) select coalesce(json_agg(ins), '[]'::json) as r from ins`;
    const rows = (await run(sql, params)).rows[0].r;
    return { body: returning ? out(rows) : null, status: returning ? 201 : 201 };
  }
  if (req.method === "PATCH") {
    const cols = Object.keys(body ?? {});
    params.push(JSON.stringify(body ?? {}));
    const where = whereOf(url, params);
    const sql = `with up as (update ${t} set (${cols.map(q).join(", ")}) = (select ${cols.map(q).join(", ")} from json_populate_record(null::${t}, $1::json))${where} returning *) select coalesce(json_agg(up), '[]'::json) as r from up`;
    const rows = cols.length ? (await run(cols.length === 1 ? sql.replace(/set \(([^)]+)\) = \(select ([^)]+) from/, "set $1 = (select $2 from") : sql, params)).rows[0].r : [];
    return { body: returning ? out(rows) : null, status: returning ? 200 : 204 };
  }
  if (req.method === "DELETE") {
    const where = whereOf(url, params);
    const rows = (await run(`with del as (delete from ${t}${where} returning *) select coalesce(json_agg(del), '[]'::json) as r from del`, params)).rows[0].r;
    return { body: returning ? out(rows) : null, status: returning ? 200 : 204 };
  }
  throw httpError(405, "PGRST105", "method not served here");
}

// ─── sign-in (GoTrue's endpoints the app and the scripts use) ────────────────
const userJson = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email ?? "", phone: u.phone ?? "",
  email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at,
  app_metadata: { provider: "email", providers: ["email"], ...(u.raw_app_meta_data ?? {}) }, user_metadata: u.raw_user_meta_data ?? {},
  identities: [], created_at: u.created_at, updated_at: u.updated_at, is_anonymous: false,
});
const su = (sql, ps = []) => serial(() => db.query(sql, ps));
async function sessionFor(u, sessionId = null) {
  let sid = sessionId;
  if (!sid) {
    sid = randomUUID();
    await su("insert into auth.sessions (id, user_id) values ($1, $2)", [sid, u.id]);
  } else await su("update auth.sessions set refreshed_at = now() at time zone 'utc', updated_at = now() where id = $1", [sid]);
  const refresh = randomBytes(24).toString("base64url");
  await su("insert into auth.refresh_tokens (token, session_id, user_id) values ($1, $2, $3)", [refresh, sid, u.id]);
  await su("update auth.users set last_sign_in_at = now() where id = $1", [u.id]);
  const now = Math.floor(Date.now() / 1000);
  const access = sign({
    aud: "authenticated", exp: now + 3600, iat: now, iss: `http://127.0.0.1:${PORT}/auth/v1`, sub: u.id, email: u.email ?? "", phone: u.phone ?? "",
    app_metadata: { provider: "email", providers: ["email"], ...(u.raw_app_meta_data ?? {}) }, user_metadata: u.raw_user_meta_data ?? {},
    role: "authenticated", aal: "aal1", amr: [{ method: "password", timestamp: now }], session_id: sid, is_anonymous: false,
  });
  return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: userJson(u) };
}
const authError = (status, code, msg) => Object.assign(new Error(msg), { status, body: { code, error_code: code, msg, message: msg, error: code, error_description: msg } });
async function auth(req, url, path, body, claims, bearer) {
  const service = claims?.role === "service_role";
  if (path === "/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const r = await su("select * from auth.users where email = $1 or (phone = $2 and $2 <> '')", [String(body.email ?? "").toLowerCase(), String(body.phone ?? "")]);
      const u = r.rows[0];
      if (!u || !passwordOk(body.password, u.encrypted_password)) throw authError(400, "invalid_credentials", "Invalid login credentials");
      return sessionFor(u);
    }
    if (grant === "refresh_token") {
      const r = await su("select t.*, u.* from auth.refresh_tokens t join auth.users u on u.id = t.user_id where t.token = $1 and not t.revoked", [String(body.refresh_token ?? "")]);
      const row = r.rows[0];
      if (!row) throw authError(400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      await su("update auth.refresh_tokens set revoked = true where token = $1", [body.refresh_token]);
      const s = await su("select id from auth.sessions where id = $1", [row.session_id]);
      if (!s.rows[0]) throw authError(400, "session_not_found", "Session not found");
      return sessionFor({ ...row, id: row.user_id }, row.session_id);
    }
    throw authError(400, "unsupported_grant_type", "unsupported grant type");
  }
  if (path === "/user") {
    const c = verify(bearer);
    if (!c?.sub) throw authError(401, "bad_jwt", "invalid JWT");
    if (req.method === "PUT") {
      if (body.password) await su("update auth.users set encrypted_password = $2, updated_at = now() where id = $1", [c.sub, hashPassword(body.password)]);
      if (body.data) await su("update auth.users set raw_user_meta_data = raw_user_meta_data || $2::jsonb where id = $1", [c.sub, JSON.stringify(body.data)]);
    }
    const r = await su("select * from auth.users where id = $1", [c.sub]);
    if (!r.rows[0]) throw authError(403, "user_not_found", "User from sub claim in JWT does not exist");
    return userJson(r.rows[0]);
  }
  if (path === "/logout") {
    const c = verify(bearer);
    if (c?.session_id) await su("delete from auth.sessions where id = $1", [c.session_id]);
    return null;
  }
  if (path.startsWith("/admin/")) {
    if (!service) throw authError(403, "not_admin", "User not allowed");
    const m = path.match(/^\/admin\/users(?:\/([0-9a-f-]{36}))?$/);
    if (!m) throw authError(404, "not_found", "not served here");
    const id = m[1];
    if (req.method === "POST" && !id) {
      const email = body.email ? String(body.email).toLowerCase() : null;
      const exists = await su("select 1 from auth.users where email = $1", [email]);
      if (exists.rows.length) throw authError(422, "email_exists", "A user with this email address has already been registered");
      const r = await su(
        "insert into auth.users (email, phone, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values ($1, $2, $3, case when $4 then now() end, $5::jsonb, $6::jsonb) returning *",
        [email, body.phone || null, body.password ? hashPassword(body.password) : null, !!body.email_confirm, JSON.stringify(body.app_metadata ?? {}), JSON.stringify(body.user_metadata ?? {})],
      );
      return userJson(r.rows[0]);
    }
    if (req.method === "PUT" && id) {
      if (body.password) await su("update auth.users set encrypted_password = $2 where id = $1", [id, hashPassword(body.password)]);
      if (body.app_metadata) await su("update auth.users set raw_app_meta_data = raw_app_meta_data || $2::jsonb where id = $1", [id, JSON.stringify(body.app_metadata)]);
      if (body.user_metadata) await su("update auth.users set raw_user_meta_data = raw_user_meta_data || $2::jsonb where id = $1", [id, JSON.stringify(body.user_metadata)]);
      if (body.email) await su("update auth.users set email = $2 where id = $1", [id, String(body.email).toLowerCase()]);
      const r = await su("select * from auth.users where id = $1", [id]);
      if (!r.rows[0]) throw authError(404, "user_not_found", "User not found");
      return userJson(r.rows[0]);
    }
    if (req.method === "GET" && id) {
      const r = await su("select * from auth.users where id = $1", [id]);
      if (!r.rows[0]) throw authError(404, "user_not_found", "User not found");
      return userJson(r.rows[0]);
    }
    if (req.method === "DELETE" && id) {
      await su("delete from auth.users where id = $1", [id]);
      return {};
    }
    if (req.method === "GET") {
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const per = Math.min(1000, Math.max(1, Number(url.searchParams.get("per_page") || 50)));
      const r = await su("select * from auth.users order by created_at limit $1 offset $2", [per, (page - 1) * per]);
      return { users: r.rows.map(userJson), aud: "authenticated" };
    }
  }
  throw authError(404, "not_found", `${req.method} ${path} is not served here`);
}

// ─── the founder's SQL (what the Management API's /database/query does for db.mjs) ────
async function sqlAsPostgres(query) {
  try {
    const res = await serial(() => db.exec(String(query ?? "")));
    const last = res[res.length - 1];
    return JSON.parse(JSON.stringify(last?.rows ?? [], (_k, v) => (typeof v === "bigint" ? Number(v) : v)));
  } catch (e) {
    throw Object.assign(new Error(e.message), { status: 400, body: { message: `Failed to run sql query: ERROR:  ${e.code ?? ""}: ${e.message}` } });
  }
}

// ─── HTTP ───────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, prefer, range, accept, accept-profile, content-profile, x-client-info, x-supabase-api-version, x-retry-count",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS",
  "Access-Control-Expose-Headers": "content-range",
};
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") return res.writeHead(204, CORS).end();
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  const bearer = String(req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
  const claims = verify(bearer) ?? verify(req.headers["apikey"]) ?? null;
  const send = (status, payload, extra = {}) => {
    const headers = { ...CORS, ...extra };
    if (payload === null || payload === undefined) return res.writeHead(status === 200 ? 204 : status, headers).end();
    res.writeHead(status, { ...headers, "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(payload));
  };
  try {
    if (!claims && !url.pathname.startsWith("/local/health")) throw httpError(401, "PGRST301", "No suitable key or wrong key type");
    if (url.pathname.startsWith("/rest/v1/rpc/")) return send(200, await rpc(decodeURIComponent(url.pathname.slice(13)), req.method === "GET" ? Object.fromEntries(url.searchParams) : body, claims));
    if (url.pathname.startsWith("/rest/v1/")) {
      const r = await table(req, url, decodeURIComponent(url.pathname.slice(9)), claims, body);
      return send(r.status ?? 200, r.body, r.range ? { "Content-Range": r.range } : {});
    }
    if (url.pathname.startsWith("/auth/v1")) return send(200, await auth(req, url, url.pathname.slice(8), body, claims, bearer));
    if (url.pathname === "/local/sql") {
      if (claims?.role !== "service_role") throw httpError(403, "not_admin", "the service key only");
      return send(201, await sqlAsPostgres(body.query));
    }
    if (url.pathname === "/local/health") return send(200, { ok: true });
    if (url.pathname.startsWith("/storage/v1")) throw httpError(400, "storage_off", "Storage is not served on this computer");
    throw httpError(404, "not_found", `${url.pathname} is not served here`);
  } catch (e) {
    if (!e.status) console.error("[localbase]", req.method, url.pathname, e);
    send(e.status ?? 500, e.body ?? { message: e.message });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`localbase: http://127.0.0.1:${PORT} (the database: ${DATA})`));
