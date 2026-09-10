# Reaching the database from this machine

`DATABASE_URL` (the Supabase pooler, ports 5432/6543) does **not** answer from this
network — connections time out. Vercel reaches it; this laptop does not.

Use the HTTPS road instead, which works anywhere the dashboard works:

    node scripts/migrate-http.mjs          # replay supabase/migrations/*.sql in order
    node scripts/sql-http.mjs "select 1"   # any statement
    node scripts/sql-http.mjs --file x.sql

Both read `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` from `.env.local`.
Scripts written against `pg` (`scripts/db.mjs`) should try `DATABASE_URL` first and,
on ETIMEDOUT, fall back to `runSql` from `scripts/sql-http.mjs`.
