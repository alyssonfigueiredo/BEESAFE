#!/usr/bin/env bash
# Aplica no banco de produção os arquivos de supabase/migrations que ainda não estão em
# irisa_ops.migrations. Cada arquivo roda numa transação só, junto com o registro dele:
# se der erro, nada daquele arquivo fica no banco e os seguintes não rodam.
# Uso: SUPABASE_DB_URL=postgresql://... scripts/aplicar-migrations.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL}"
PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q)

"${PSQL[@]}" -c "create schema if not exists irisa_ops;
  create table if not exists irisa_ops.migrations (arquivo text primary key, aplicada_em timestamptz not null default now());"

aplicadas=$("${PSQL[@]}" -At -c "select arquivo from irisa_ops.migrations")
novas=0
for f in supabase/migrations/*.sql; do
  nome=$(basename "$f")
  grep -qxF "$nome" <<<"$aplicadas" && continue
  echo "aplicando $nome"
  "${PSQL[@]}" -1 -f "$f" -c "insert into irisa_ops.migrations (arquivo) values ('$nome')"
  novas=$((novas + 1))
done
echo "$novas migration(s) aplicada(s)"
