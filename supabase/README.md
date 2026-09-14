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

- Municípios: IBGE, por UF (41 = PR). Feito: PR (399 municípios). Sem argumentos importa as 27 UFs (~5.570 municípios).
- Bairros: OSM via Overpass (3 mirrors, fallback automático). Feito: Curitiba (74 bairros). Sem argumentos importa todas as capitais.
  A cidade precisa já estar em `cities`: rode `import-cities.mjs` antes. O script avisa quais faltam, tenta de novo
  no fim as que o Overpass derrubou e imprime o comando para repetir só as que sobraram.

Para cobrir o país inteiro (na ordem):

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-cities.mjs
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-neighborhoods.mjs
```

Depois rode de novo o `seed_services.sql` (traz os serviços das capitais que passaram a existir) e o UPDATE de
reprocessamento de bairros abaixo.
- Bairros são atribuídos ao relato no insert. Depois de importar bairros de uma cidade que já tinha relatos, reprocesse:

```sql
update public.occurrences o set neighborhood_id = n.id
from public.neighborhoods n
where n.city_id = o.city_id and o.neighborhood_id is null
  and st_contains(n.geom, o.location::geometry);
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
10. `migrations/00000000000008_servicos_unicos.sql`
11. `seed_services.sql` (depois do import de municípios: nacionais + capitais já importadas). Idempotente: rodar de novo atualiza e acrescenta.
12. Opcional, só em ambiente de teste: `seed/curitiba-teste.sql` (8 usuários e 5 lugares cobrindo os 5 selos).
    **Remover antes do lançamento** com `seed/limpar-teste.sql`.

Aplicado no projeto `ntjirpqulrnieeglpiei` até o item 9. Faltam rodar lá: `00000000000008_servicos_unicos.sql`,
a nova versão do `seed_services.sql` e, antes do lançamento, `seed/limpar-teste.sql`.

## Serviços de apoio

`seed_services.sql` tem os nacionais e os de Curitiba, Porto Alegre, São Paulo, Rio de Janeiro, Belo Horizonte,
Salvador, Recife, Fortaleza e Brasília — só entradas conferidas em fonte oficial (prefeitura, governo estadual ou
site da própria ONG). As demais capitais ainda dependem de levantamento local; enquanto não houver, o app mostra
os nacionais, entre eles o Mapa da Cidadania da ABGLT, que cobre os 27 estados. Serviço com telefone errado é pior
que serviço ausente: não acrescente entrada sem conferir na fonte.

Para promover alguém a moderador: `update public.profiles set role = 'moderator' where id = '<uuid do usuário>';`
