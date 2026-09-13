# Supabase

Migrations em `migrations/`, aplicadas em ordem pelo nome.

Setup local (opcional): instale a CLI (`npm i -g supabase`), rode `supabase init` uma vez e `supabase link --project-ref <ref>`.
Depois `supabase db push` aplica as migrations no projeto remoto.

Regras:

- `created_by` nunca sai do banco. Toda leitura pública passa por views sem essa coluna.
- RLS ligado em todas as tabelas. Sem exceção.
- Chave `service_role` só em Edge Functions. Nunca no app.

## Teste local

`scripts/db-smoke.sh` sobe um Postgres temporário (precisa de `postgresql-16-postgis-3` e `postgresql-16-cron`),
aplica `dev/supabase-stubs.sql` (auth, realtime e roles fingidos), as migrations, o seed e roda `dev/smoke.sql`.

## Dados geográficos

- Municípios: `node scripts/import-cities.mjs` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (roda na sua máquina).
- Bairros: import do OSM por cidade, fase 1.x. Sem bairro o relato fica no nível de cidade.
