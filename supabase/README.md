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
19. `migrations/00000000000016_testadores.sql`
20. `migrations/00000000000017_prominence.sql`
21. `migrations/00000000000018_perfil_robusto.sql` (perfil: update_my_profile definer, ensure_my_profile)
22. `migrations/00000000000020_bloqueio.sql` (bloqueio por usuário: tabela, RPCs e views filtradas)
23. `migrations/00000000000021_apple_token.sql` (refresh token da Apple para revogar ao excluir a conta)
15. O seed fictício de Curitiba foi removido do repositório. Para apagar os dados de teste que ainda estejam no banco, rode `seed/limpar-curitiba-teste.sql` (apaga só os ids `11111111-`/`22222222-`/`33333333-` e recalcula os priors).

Aplicado até a 17 (10 a 16 em 23/09/2026, 17 em 25/09/2026; leitura dos testadores em `testadores.sql`).
A 18 (perfil robusto) em 27/09/2026; 20 e 21 (bloqueio e token da Apple, `colar-20-21.sql`) em 28/09/2026.
(Não existe 19: o número ficou vago na renumeração.)

Para promover alguém a moderador: `update public.profiles set role = 'moderator' where id = '<uuid do usuário>';`

## Edge Functions (`functions/`)

Duas funções em Deno, para o que a Apple exige na regra 5.1.1 (revogar o "Entrar com a Apple" ao excluir a conta):

- `apple-token`: o app chama logo depois do login com a Apple, com o `authorizationCode` (vale 5 minutos).
  A função troca o código pelo refresh token na Apple e grava em `public.apple_refresh_tokens`
  (tabela sem policy nenhuma: só a chave de serviço lê).
- `delete-account`: o app chama em Perfil → Excluir minha conta. Se a conta entrou com a Apple e há token
  guardado, revoga na Apple **antes** de apagar o usuário; se a Apple recusar, não apaga e devolve erro
  (o app mostra "tente de novo"). Conta sem Apple: apaga direto. Se a função não estiver publicada, o app
  cai na RPC `delete_my_account` só para contas que não são da Apple.

Código compartilhado em `functions/_shared/` (JWT ES256 do `client_secret` assinado com a chave .p8, sem
dependência externa).

### Setup, uma vez (no Mac, pasta BEESAFE)

1. Chave da Apple: developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → **+** →
   nome "Irisa Sign in with Apple", marcar **Sign in with Apple** → Configure → Primary App ID = o App ID
   do app iOS → Save → Continue → Register → **Download** (arquivo `AuthKey_XXXXXXXXXX.p8`, só baixa uma
   vez; guardar fora do repositório). Anotar o **Key ID** (os 10 caracteres do nome do arquivo) e o
   **Team ID** (canto superior direito da página, ou Membership).
2. Login na CLI e publicação das funções:

```bash
npx supabase login
npx supabase functions deploy apple-token delete-account --project-ref ntjirpqulrnieeglpiei
```

3. Secrets (trocar os valores; a chave .p8 entra inteira, com as linhas BEGIN/END):

```bash
npx supabase secrets set --project-ref ntjirpqulrnieeglpiei \
  APPLE_TEAM_ID=SEU_TEAM_ID \
  APPLE_KEY_ID=SEU_KEY_ID \
  APPLE_PRIVATE_KEY="$(cat ~/Downloads/AuthKey_SEU_KEY_ID.p8)" \
  SB_SECRET_KEY=sb_secret_...
```

`SB_SECRET_KEY` é a mesma `sb_secret_` dos scripts (as chaves legadas estão desativadas, então a
`SUPABASE_SERVICE_ROLE_KEY` que a Supabase injeta sozinha não serve). `APPLE_CLIENT_ID` é opcional: sem ele
a função usa o bundle id que o app informa (`ios.bundleIdentifier` do `app.config.ts`, `br.com.irisa.ios`).

4. Migration 21 colada no SQL Editor (a tabela `apple_refresh_tokens`).

### Como testar de ponta a ponta

1. Build EAS de iOS (Sign in with Apple só entra com `APP_ENV=preview|production`), entrar com a Apple.
2. No SQL Editor: `select user_id, client_id, created_at from public.apple_refresh_tokens;` — tem que ter a linha.
   Se não tiver, olhar Supabase → Edge Functions → apple-token → Logs (erro da troca do código ou secret faltando).
3. No iPhone: Ajustes → [seu nome] → Iniciar sessão com a Apple → **Irisa** aparece na lista.
4. No app: Perfil → Excluir minha conta.
5. De volta em Ajustes → Iniciar sessão com a Apple: **Irisa sumiu da lista**. É isso que prova a revogação do
   lado da Apple. Se ainda estiver lá, a revogação não aconteceu: Logs da `delete-account`.
6. `select count(*) from auth.users where id = '<uuid>'` = 0 e a linha de `apple_refresh_tokens` também foi (cascade).
