#!/usr/bin/env bash
# Sobe um Postgres 16 temporário (precisa de postgis e pg_cron instalados), aplica stubs + migrations + seed
# e roda supabase/dev/smoke.sql. Uso: scripts/db-smoke.sh
set -euo pipefail
PG=${PG_BIN:-/usr/lib/postgresql/16/bin}
D=$(mktemp -d)
PORT=${PORT:-54329}
cleanup() { "$PG/pg_ctl" -D "$D" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
"$PG/initdb" -D "$D" -A trust >/dev/null
"$PG/pg_ctl" -D "$D" -o "-p $PORT -k $D -c shared_preload_libraries=pg_cron -c cron.database_name=irisa" -l "$D/log.txt" start >/dev/null
"$PG/createdb" -h "$D" -p "$PORT" irisa
run() { "$PG/psql" -h "$D" -p "$PORT" -d irisa -v ON_ERROR_STOP=1 -q -f "$1"; }
run supabase/dev/supabase-stubs.sql
for f in supabase/migrations/*.sql; do run "$f"; done
run supabase/seed.sql
run supabase/dev/supabase-grants.sql
run supabase/seed_services.sql 2>/dev/null || true
"$PG/psql" -h "$D" -p "$PORT" -d irisa -v ON_ERROR_STOP=1 -f supabase/dev/smoke.sql
echo "smoke ok"
