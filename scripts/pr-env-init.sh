#!/usr/bin/env bash
set -euo pipefail
log() { echo "[pr-env-init] $*"; }

[[ -n "${RAILWAY_ENVIRONMENT_NAME:-}" ]] || { log "not on Railway, skip"; exit 0; }
[[ "${RAILWAY_ENVIRONMENT_NAME}" != "production" ]] || { log "production env, skip"; exit 0; }

: "${DATABASE_URL:?DATABASE_URL required}"
[[ -n "${PROD_DATABASE_URL:-}" ]] || { log "PROD_DATABASE_URL unset, skip"; exit 0; }

[[ "${DATABASE_URL}" != "${PROD_DATABASE_URL}" ]] || { log "FATAL: DATABASE_URL equals PROD_DATABASE_URL"; exit 1; }

log "env=${RAILWAY_ENVIRONMENT_NAME} branch=${RAILWAY_GIT_BRANCH:-?}"

SEEDED=$(psql "${DATABASE_URL}" -tAc \
  "SELECT to_regclass('public._pr_env_seeded') IS NOT NULL;" 2>/dev/null || echo f)
[[ "${SEEDED}" != "t" ]] || { log "sentinel found, skip"; exit 0; }

log "streaming pg_dump | psql from prod…"
pg_dump --no-owner --no-privileges --clean --if-exists --quote-all-identifiers \
  -d "${PROD_DATABASE_URL}" \
  | psql --set ON_ERROR_STOP=1 -d "${DATABASE_URL}"

log "writing sentinel…"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public._pr_env_seeded (seeded_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public._pr_env_seeded DEFAULT VALUES;
SQL

log "done."
