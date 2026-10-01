#!/usr/bin/env bash
# Aplica no banco de produção os arquivos de supabase/migrations que ainda não estão em
# irisa_ops.migrations. Cada arquivo roda numa transação só, junto com o registro dele:
# se der erro, nada daquele arquivo fica no banco e os seguintes não rodam.
# Uso: SUPABASE_DB_URL=postgresql://... scripts/aplicar-migrations.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL}"
URL=$SUPABASE_DB_URL

# A conexão direta (db.<ref>.supabase.co) é só IPv6 e o GitHub não alcança: troca pelo pooler
# de sessão (o projeto fica em us-east-1), com o usuário postgres.<ref> que o pooler exige.
if [[ $URL =~ ^postgres(ql)?://postgres:(.*)@db\.([a-z0-9]+)\.supabase\.co(:[0-9]+)?/(.*)$ ]]; then
  senha=${BASH_REMATCH[2]} ref=${BASH_REMATCH[3]} banco=${BASH_REMATCH[5]}
  URL=""
  for h in aws-0-us-east-1 aws-1-us-east-1 aws-0-sa-east-1 aws-1-sa-east-1; do
    tentativa="postgresql://postgres.$ref:$senha@$h.pooler.supabase.com:5432/$banco"
    if erro=$(psql "$tentativa" -X -q -c "select 1" 2>&1 >/dev/null); then URL=$tentativa; echo "usando o pooler $h"; break; fi
    echo "$h: $erro" >&2
  done
  [[ -n $URL ]] || { echo "não conectou pelo pooler; confira a senha no secret SUPABASE_DB_URL" >&2; exit 1; }
fi
PSQL=(psql "$URL" -v ON_ERROR_STOP=1 -X -q)

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
