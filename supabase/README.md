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

## Chaves

As chaves legadas (anon/service_role JWT) estão desativadas no projeto. Use:

- App (`.env`): `sb_publishable_...` em `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Scripts de import: `sb_secret_...` em `SUPABASE_SERVICE_ROLE_KEY`. Nunca no repositório nem em chat.

## Dados geográficos

Rodam na sua máquina, com as variáveis na frente do comando:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-cities.mjs 41
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-neighborhoods.mjs 4106902
```

- Municípios: IBGE, por UF (41 = PR). Feito: as 27 UFs (5.570 municípios).
- Lugares iniciais: OSM via Overpass, `scripts/import-places-osm.mjs [ibge] [--limite N] [--bairros "Centro,Batel"]`.
  Entram sem nota, só para o mapa não abrir vazio. Pula nomes que já existem na cidade.
- Bairros: OSM via Overpass (3 mirrors, fallback automático). Sem argumentos importa todas as capitais.
  Feito: as capitais, menos Brasília, São Luís e Palmas, que não têm `admin_level=10` no OSM
  (São Paulo tem só 9 polígonos, também limitação da fonte). Capital que falhar com 504 é só repetir
  passando o código IBGE dela.
- Bairros são atribuídos ao relato no insert. Depois de importar bairros de uma cidade que já tinha relatos, reprocesse:

```sql
update public.occurrences o set neighborhood_id = n.id
from public.neighborhoods n
where n.city_id = o.city_id and o.neighborhood_id is null
  and st_contains(n.geom, o.location::geometry);

update public.places p set neighborhood_id = n.id
from public.neighborhoods n
where n.city_id = p.city_id and p.neighborhood_id is null
  and st_contains(n.geom, p.location::geometry);
```

## Ordem para aplicar no SQL Editor da Supabase

1. `migrations/00000000000000_extensions.sql`
2. `migrations/00000000000001_core_schema.sql`
3. `migrations/00000000000002_import_helpers.sql`
4. `seed.sql`
5. `migrations/00000000000003_places.sql`
6. `migrations/00000000000004_support.sql`
7. `migrations/00000000000005_moderation.sql`
8. `migrations/00000000000006_acolhimento.sql`
9. `migrations/00000000000007_relato_no_lugar.sql`
10. `seed_services.sql` (depois do import de municípios: serviços nacionais, Curitiba e Porto Alegre)
11. `migrations/00000000000008_borda_municipio.sql`
12. `migrations/00000000000009_foto_google.sql`
13. `migrations/00000000000010_lugar_duplicado.sql`
14. `migrations/00000000000011_rls_initplan.sql`
15. `migrations/00000000000012_relato_nao_e_do_lugar.sql`
16. `migrations/00000000000013_confianca_da_regiao.sql`
17. `migrations/00000000000014_onde_e_quando.sql`
18. `migrations/00000000000015_ficha_do_bairro.sql`
15. O seed fictício de Curitiba foi removido do repositório. Para apagar os dados de teste que ainda estejam no banco, rode `seed/limpar-curitiba-teste.sql` (apaga só os ids `11111111-`/`22222222-`/`33333333-` e recalcula os priors).

Aplicado até a 15 (10 a 15 em 23/09/2026).

Para promover alguém a moderador: `update public.profiles set role = 'moderator' where id = '<uuid do usuário>';`
