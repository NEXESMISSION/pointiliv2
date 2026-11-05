#!/usr/bin/env bash
# Pointili on Google Cloud Run — the backup to Vercel. Step by step: CLOUDRUN.md.
#
#   bash scripts/cloudrun.sh          build and deploy (from v2/, in Git Bash on Windows); the two
#                                     daily jobs are made PAUSED, so they never run twice with Vercel's
#   bash scripts/cloudrun.sh --live   after the domain points here: also switch the daily jobs on
#
# Needs: gcloud installed and signed in, a project set (gcloud config set project <id>), and
# .env.cloudrun (the production settings, gitignored). Builds on Google Cloud Build: no Docker here.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICE="${SERVICE:-pointili}"
REGION="${REGION:-europe-west1}"   # Belgium: next to Supabase in eu-west-1 (Ireland)
ENV_FILE=".env.cloudrun"
RUNTIME=".env.cloudrun.yaml"       # every setting, for the running service (gitignored, never uploaded)
LIVE=0
[ "${1:-}" = "--live" ] && LIVE=1

# on Windows, Git Bash may only see gcloud.cmd
GCLOUD=gcloud
command -v gcloud >/dev/null 2>&1 || { command -v gcloud.cmd >/dev/null 2>&1 && GCLOUD=gcloud.cmd; } || { echo "gcloud is not installed (CLOUDRUN.md, step 2)"; exit 1; }
PROJECT="$("$GCLOUD" config get-value project 2>/dev/null | tr -d '\r')"
[ -n "$PROJECT" ] || { echo "No Google Cloud project set: $GCLOUD config set project <project-id>"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "$ENV_FILE is missing (the production settings)"; exit 1; }
get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r'; }
[ -n "$(get NEXT_PUBLIC_SUPABASE_URL)" ] && [ -n "$(get SUPABASE_SERVICE_ROLE_KEY)" ] || { echo "$ENV_FILE lacks the Supabase settings"; exit 1; }

trap 'rm -f .env.production "$RUNTIME"' EXIT
# 1. the public values the build bakes into the browser's code (the only settings uploaded to the build)
grep -E '^NEXT_PUBLIC_[A-Z_]+=' "$ENV_FILE" | tr -d '\r' > .env.production
# 2. every setting, for the running service — YAML, each value quoted
grep -E '^[A-Z_]+=' "$ENV_FILE" | tr -d '\r' | while IFS= read -r line; do
  printf '%s: "%s"\n' "${line%%=*}" "$(printf '%s' "${line#*=}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
done > "$RUNTIME"

echo "== Project $PROJECT, service $SERVICE in $REGION"
"$GCLOUD" services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com --quiet

# request-based billing (CPU only while answering), scaled to zero when nobody is there, at most 4
# instances so a spike can never run up a bill
"$GCLOUD" run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated \
  --port 8080 --cpu 1 --memory 512Mi --concurrency 80 --min-instances 0 --max-instances 4 \
  --cpu-boost --env-vars-file "$RUNTIME" --quiet

URL="$("$GCLOUD" run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)' | tr -d '\r')"

# the two daily jobs Vercel ran (vercel.json, UTC), with the secret the routes check
SECRET="$(get CRON_SECRET)"
job() {
  local name="$1" schedule="$2" path="$3"
  if "$GCLOUD" scheduler jobs describe "$name" --location "$REGION" >/dev/null 2>&1; then
    "$GCLOUD" scheduler jobs update http "$name" --location "$REGION" --schedule "$schedule" --time-zone "Etc/UTC" \
      --uri "$URL$path" --http-method GET --update-headers "Authorization=Bearer $SECRET" --quiet >/dev/null
  else
    "$GCLOUD" scheduler jobs create http "$name" --location "$REGION" --schedule "$schedule" --time-zone "Etc/UTC" \
      --uri "$URL$path" --http-method GET --headers "Authorization=Bearer $SECRET" --quiet >/dev/null
    "$GCLOUD" scheduler jobs pause "$name" --location "$REGION" --quiet >/dev/null
  fi
  if [ "$LIVE" = 1 ]; then "$GCLOUD" scheduler jobs resume "$name" --location "$REGION" --quiet >/dev/null; fi
}
if [ -n "$SECRET" ]; then
  job pointili-remind "0 10 * * *" /api/cron/remind
  job pointili-digest "0 7 * * *" /api/cron/digest
  [ "$LIVE" = 1 ] && echo "== Daily jobs: ON" || echo "== Daily jobs: made (paused until --live)"
else
  echo "== No CRON_SECRET in $ENV_FILE: daily jobs skipped"
fi

echo
echo "== Deployed: $URL"
echo "   Check it: $URL/  and  $URL/prix"
