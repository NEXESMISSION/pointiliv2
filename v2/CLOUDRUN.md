# Pointili on Google Cloud Run — the backup to Vercel

Vercel's free plan is for non-commercial use and is over its CPU allowance (Nov 2026). If Vercel pauses
the project, every page — the shops' QR screens included — answers `503 DEPLOYMENT_PAUSED` until it is
lifted. This is the way out: the same site, same Supabase database, on Google Cloud Run's free tier.
Set it up **now** (about 45 minutes), so that switching later takes minutes, not days.

What is in the repository for it:

| File | What it does |
| --- | --- |
| `Dockerfile` | Builds the site as one Node server (`output: "standalone"`, only when `NEXT_STANDALONE=1` — Vercel's build is unchanged) |
| `.gcloudignore`, `.dockerignore` | Keep every secret out of the upload and the image |
| `scripts/cloudrun.sh` | Builds on Google Cloud Build, deploys, sets the two daily jobs |
| `.env.cloudrun` | **Not in git.** The production settings, pulled from Vercel. Keep it safe; it holds the database's secret key |

## Cost

Cloud Run's free tier (per billing account, per month — check https://cloud.google.com/run/pricing,
it changes) covers 2 million requests and about 50 vCPU-hours. Without Vercel's CDN, pictures and the
app's files are requests too: today's traffic would be about 1 million a month — half the free amount —
and well under half the CPU. Cloud Scheduler's first 3 jobs are free (we use 2). What can cost a little is data sent out of
Google (pictures, pages) — at today's traffic, expect cents, not dollars. The deploy caps the service at
4 instances, so a spike cannot run up a bill. **Set a budget alert** (step 1) anyway.

## One-time setup (do it now)

1. **Google Cloud account and project.** At https://console.cloud.google.com create a project (e.g.
   `pointili`), then *Billing* → link a billing account (a card is asked for; the free tier is still
   free). Then *Billing → Budgets & alerts* → a budget of **$1** with email alerts at 50% and 100%.
2. **Install the gcloud CLI** on Windows: https://cloud.google.com/sdk/docs/install — then in a new
   terminal: `gcloud init` (sign in with that Google account, pick the project).
3. **Deploy** — in Git Bash, from `v2/`:
   ```bash
   bash scripts/cloudrun.sh
   ```
   The first run enables the services and builds for ~5–10 minutes. It ends with the service's address
   (`https://pointili-….run.app`). Open it and `/prix`: the site, with the real data. The daily jobs are
   made **paused**, so they do not run twice while Vercel still runs its own.
4. **Prove you own the domain to Google, and map it** (nothing changes for visitors yet):
   ```bash
   gcloud domains verify pointili.online
   ```
   It opens Google Search Console: copy the TXT record it gives and add it at **Spaceship** (where the
   domain's DNS lives) → *Domain → DNS records*. Once Search Console says verified:
   ```bash
   gcloud beta run domain-mappings create --service pointili --domain www.pointili.online --region europe-west1
   gcloud beta run domain-mappings create --service pointili --domain pointili.online --region europe-west1
   gcloud beta run domain-mappings describe --domain www.pointili.online --region europe-west1
   gcloud beta run domain-mappings describe --domain pointili.online --region europe-west1
   ```
   Write down the records the two `describe` commands list (a CNAME for `www`; A and AAAA for the bare
   domain). **Do not set them yet.**
5. **Make a future switch fast:** at Spaceship, set the TTL of the `www` and `@` records to **5 minutes**
   (300 s). Today they are cached for hours, so a change would take hours to reach everyone.

## The switch (if Vercel pauses the site — or to move for good)

1. At Spaceship, replace the two records with the ones from step 4:
   - `www` — CNAME: today `5f36df0674c78029.vercel-dns-017.com` → `ghs.googlehosted.com`
   - `@` (pointili.online) — A: today `216.198.79.1` → Google's four A records (and add the AAAA ones)
2. Switch the daily jobs on:
   ```bash
   bash scripts/cloudrun.sh --live
   ```
3. Wait for Google's HTTPS certificate: usually 15–60 minutes after the records change, up to 24 h.
   Until it is issued, `https://` on the domain fails for people whose DNS already moved. Check with
   `gcloud beta run domain-mappings describe --domain www.pointili.online --region europe-west1`
   (`CertificateProvisioned: True`).
4. Printed QR codes (`/join/…`, `/s/…`) keep working: they carry the domain, and the domain moved.

**Back to Vercel:** put the two old records back (above), and pause the jobs:
`gcloud scheduler jobs pause pointili-remind --location europe-west1` (and `pointili-digest`).

## Updating the backup

Run `bash scripts/cloudrun.sh` again after changes (add `--live` once it serves the domain). It deploys
the files as they are in `v2/` — commit first, and never with someone's half-done work in the folder.
If a production setting changes on Vercel, update `.env.cloudrun` too.

## What differs from Vercel

- **No visitor country/city** in the console's traffic pages: Vercel adds them to each request, Cloud
  Run does not. Everything else in the analytics works.
- **The first visit after a quiet spell** (no one for ~15 minutes) waits 1–3 s while a server starts.
  An open QR screen keeps it awake during opening hours.
- Pictures and the app's files come from the server itself, not a worldwide CDN — fine for Tunisia,
  a little slower far away.

## To do before early 2027 (both hosts)

Production still uses Supabase's **legacy** anon key (a JWT). Supabase retires legacy keys in early
2027: switch `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's publishable key (`sb_publishable_…`, in
`.env.local`) on Vercel and in `.env.cloudrun`, and redeploy both.
