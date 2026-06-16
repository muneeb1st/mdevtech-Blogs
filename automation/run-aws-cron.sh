#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${MDEVTECH_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${MDEVTECH_BRANCH:-main}"
LOCK_FILE="${MDEVTECH_LOCK_FILE:-/tmp/mdevtech-blogs-cron.lock}"
LOG_FILE="${MDEVTECH_LOG_FILE:-$REPO_DIR/automation/cron.log}"

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
export SITE_URL="${SITE_URL:-https://mdevtech.vercel.app}"
export STRICT_SEO="${STRICT_SEO:-1}"
export PREFER_LOW_DIFFICULTY_KEYWORDS="${PREFER_LOW_DIFFICULTY_KEYWORDS:-1}"
export HERMES_TIMEOUT_MS="${HERMES_TIMEOUT_MS:-600000}"

mkdir -p "$(dirname "$LOG_FILE")"
exec >>"$LOG_FILE" 2>&1

echo "[$(date -Is)] mdevtech blog cron starting"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -Is)] another cron run is active; exiting"
  exit 0
fi

cd "$REPO_DIR"

if [ -n "$(git status --porcelain)" ]; then
  echo "[$(date -Is)] repo is dirty before cron; refusing to run"
  git status --short
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if command -v hermes >/dev/null 2>&1; then
  echo "[$(date -Is)] hermes found: $(command -v hermes)"
else
  echo "[$(date -Is)] hermes not found in PATH; generator will use deterministic fallback if Hermes is required"
fi

npm ci
npm run generate
npm run build:strict
npm run audit:seo:strict

git add content/posts public scripts src package.json package-lock.json .github/workflows automation AGENTS.md README.md vercel.json static

if git diff --cached --quiet; then
  echo "[$(date -Is)] no generated changes to commit"
  exit 0
fi

git config user.name "${GIT_AUTHOR_NAME:-mdevtech-aws-cron}"
git config user.email "${GIT_AUTHOR_EMAIL:-mdevtech-aws-cron@users.noreply.github.com}"
git commit -m "chore: generate scheduled SEO blog post"
git push origin "$BRANCH"

echo "[$(date -Is)] mdevtech blog cron finished"
