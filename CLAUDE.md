# Irisa — contexto para novas sessões

Leia este arquivo inteiro antes de agir. Detalhes em PLANO.md, README.md, supabase/README.md, docs/.

## Como falar com o usuário

Alysson (também assina Leandro). Português. Sem cumprimentos, sem formalidade, respostas curtas e diretas.
Não pergunte o que dá para decidir sozinho. Ele não é dev: dê comandos prontos para colar no Terminal
do Mac e SQL pronto para colar no SQL Editor do Supabase. Nunca peça nem aceite chaves secretas em chat.

## O que é

App nacional (Brasil) para a comunidade LGBTQIA+: relatos anônimos de LGBTIfobia, mapa de áreas de atenção,
lugares avaliados em quatro eixos de acolhimento (atendimento, afeto, banheiro, clientela), mural de apoio,
botão de emergência. Cidade de referência: Curitiba (parceiros-alvo: Grupo Dignidade, Centro de Cidadania LGBTQIA+).
Nome: **Irisa** (INPI livre; @irisapp livre). Bundle id `br.com.irisa.app`. Contato: appirisa@gmail.com.

## Estado atual (2026-09-14)

- Branch de trabalho: `claude/laughing-keller-my8t7c` (default do repo: `claude/ecstatic-darwin-cmf7sw`).
- MVP completo e rodando no iPhone do usuário (Xcode, Apple ID gratuito, expira em 7 dias) e em APK Android (EAS preview).
- Supabase projeto `ntjirpqulrnieeglpiei`, região São Paulo. Todas as 8 migrations + seeds aplicadas.
  O seed fictício de Curitiba saiu do repositório; `supabase/seed/limpar-curitiba-teste.sql` apaga o que sobrou no banco.
- Chaves legadas desativadas: app usa `sb_publishable_...`, scripts usam `sb_secret_...` (só na máquina dele).
- Dados geográficos: os 5.570 municípios das 27 UFs e os bairros das capitais importados. Sem bairros no OSM:
  Brasília, São Luís e Palmas (São Paulo só 9). `upsert_neighborhoods` agrupa nomes repetidos antes do upsert.
- Login: e-mail/senha OK, Google configurado no Supabase (testar no Android exige SHA-1 da keystore EAS no Google Cloud),
  Apple só em builds EAS (`APP_ENV=preview|production`).
- Site público (GitHub Pages, workflow `pages.yml`, fonte `docs/*.md` → `scripts/build-site.mjs` → `site/`):
  https://alyssonfigueiredo.github.io/BEESAFE/ com privacidade.html, termos.html, pitch.html, mockup.html.
- Curitiba semeada com 60 lugares reais do OSM (bar/café/restaurante/balada/hotel), sem nota e sem selo,
  só para o mapa não abrir vazio. A tag `lgbtq` do OSM quase não existe no Brasil (1 lugar em Curitiba):
  a lista da cena tem que vir do usuário, conferida um a um. Decidido não exibir rótulo LGBTQIA+ na ficha
  (lista pública vira alvo); o selo vem dos quatro eixos de acolhimento.
- Decidido lançar primeiro no Android. iOS fica para depois do primeiro retorno da Play Store.
- Layout do Início decidido: painel (opção A do mockup).
- Ficha das lojas pronta em docs/lojas.md.

## Stack

Expo SDK 57, Expo Router, NativeWind v4, TypeScript, TanStack Query, MapLibre React Native v11 com tiles Esri
Light Gray (sem chave), Supabase JS. Fontes: Urbanist (wordmark), Oswald (display), Space Grotesk (corpo).
Paleta clara em `src/theme/tokens.js` (paper #FAF9F6, night #1E2340, coral/orange/yellow/turquoise/lilac, âmbar #E0A32E).
Backend: Postgres + PostGIS (schema `extensions`, funções precisam de `set search_path = public, extensions`),
RLS em tudo, views públicas sem `created_by`, realtime por broadcast, pg_cron, rate limits por trigger.
Ranking de acolhimento: média bayesiana (m=5, priors por categoria), meia-vida 6 meses, penalidade por relatos
a 100 m, selos poucas/atencao/dividido/acolhedor/bem, mínimo 5 avaliações. Obfuscação ~100 m só para relatos de hoje/ontem.

## Comandos que o usuário roda no Mac (pasta BEESAFE)

```bash
git pull
npx expo run:ios --device                 # reinstala no iPhone (precisa a cada 7 dias)
npx expo start --dev-client               # Metro; tecla r recarrega
npx expo run:ios --device --configuration Release   # sem Metro, para prints
npx eas-cli build -p android --profile preview      # APK por link
npx eas-cli build -p android --profile production   # AAB para a Play Store
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-neighborhoods.mjs <ibge>
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/import-places-osm.mjs 4106902 --limite 60
bash scripts/screenshots.sh                          # prints das lojas no Simulador
```

Checks antes de commitar: `npm run lint && npm run typecheck`. Migrations testáveis localmente com `scripts/db-smoke.sh`.

## Próximos passos (em ordem)

1. Conta no Google Play Console (US$25, pode ser a conta pessoal dele; adicionar appirisa@gmail.com como admin).
   Preencher com docs/lojas.md. Teste fechado: 12 testadores por 14 dias, depois produção.
2. SHA-1 da keystore EAS (`npx eas-cli credentials -p android`) no Google Cloud para login Google no Android.
3. Fonte alternativa de bairros para Brasília, São Luís, Palmas e São Paulo (OSM não cobre).
4. Implementar ocultar autor (bloqueio por usuário). Hoje não existe: no IARC está declarado **Não**,
   e a Apple exige pela regra 1.2. Ao implementar, atualizar a resposta do questionário na mesma versão.
5. Apple Developer (US$99/ano) quando decidir publicar no iOS; ou via ONG parceira (Apple isenta ONGs).
   Denúncia, moderação e excluir conta já existem.
6. Fase 6+: notificações por área, rotas seguras, versão web.

## Armadilhas já resolvidas (não repetir)

- Overpass devolve 406 sem Content-Type/User-Agent; script já tem 3 mirrors.
- `st_makevalid` pode gerar GeometryCollection: usar `st_collectionextract(..., 3)`.
- Bairro é atribuído no insert do relato; após importar bairros, rodar o UPDATE de reprocessamento (supabase/README.md).
- Xcode: nunca aplicar "Update to recommended settings"; Personal Team some após `prebuild --clean`; erro
  "Missing package product MapLibre" no Xcode GUI, mas `expo run:ios --device` no terminal compila.
- MapLibre usa LngLat como `[lng, lat]`. Câmera enquadra dados só no primeiro carregamento (`CityMap.tsx`).
- ESLint proíbe setState em effect: usar estado derivado ou useQuery.
- SQL Editor do Supabase mostra "No rows returned" em UPDATE bem-sucedido; confirmar com SELECT.
- As variáveis do EAS são por ambiente: `env:push preview` não vale para `production`. Se o build não
  imprimir `EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL` carregadas, o app sai sem backend.
  Antes do primeiro build de produção: `npx eas-cli env:push production --path .env`.
