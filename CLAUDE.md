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
- Supabase projeto `ntjirpqulrnieeglpiei`, região São Paulo. Migrations 0–8 aplicadas; a 9 (foto Google) precisa ser colada no SQL Editor.
  O seed fictício de Curitiba saiu do repositório; `supabase/seed/limpar-curitiba-teste.sql` apaga o que sobrou no banco.
- Chaves legadas desativadas: app usa `sb_publishable_...`, scripts usam `sb_secret_...` (só na máquina dele).
- Dados geográficos: os 5.570 municípios das 27 UFs e os bairros das capitais importados. Sem bairros no OSM:
  Brasília, São Luís e Palmas (São Paulo só 9). `upsert_neighborhoods` agrupa nomes repetidos antes do upsert.
- Login: e-mail/senha OK, Google pelo navegador do sistema via Supabase (PKCE, cliente OAuth do tipo
  Aplicativo da Web) — não usa o SDK nativo, então SHA-1 não entra em nada; Apple nativo, só em builds
  EAS (`APP_ENV=preview|production`).
- Site público (GitHub Pages, workflow `pages.yml`, fonte `docs/*.md` → `scripts/build-site.mjs` → `site/`):
  https://alyssonfigueiredo.github.io/BEESAFE/ com privacidade.html, termos.html, pitch.html, mockup.html.
- Sete cidades semeadas com lugares reais do OSM (bar/café/restaurante/balada/hotel), sem nota e sem selo,
  só para o mapa não abrir vazio: Curitiba 60, Recife 60, João Pessoa 43, São Paulo 80, Rio 84,
  Salvador 63, Porto Alegre 60. A tag `lgbtq` do OSM quase não existe no Brasil (1 lugar em Curitiba):
  a lista da cena tem que vir do usuário, conferida um a um. Decidido não exibir rótulo LGBTQIA+ na ficha
  (lista pública vira alvo); o selo vem dos quatro eixos de acolhimento.
- Decidido lançar primeiro no Android. iOS fica para depois do primeiro retorno da Play Store.
- Play Console: versão 8 (0.1.0) enviada para revisão na faixa de teste fechado em 22/09/2026, com a
  ficha da loja, os prints e o gráfico de recursos. Falta a lista de testadores completar 12 pessoas
  por 14 dias seguidos antes de pedir produção. Apps da categoria Social exigem a declaração de
  padrões de segurança infantil (CSAE): política em `docs/seguranca-infantil.md`, publicada em
  /seguranca-infantil.html, contato appirisa@gmail.com.
- Fotos do Google por cidade (22/09/2026): Curitiba 51/60, Recife 48/60, João Pessoa 32/43. Quem não
  casou fica sem foto e cai no ícone da categoria; o script só tenta de novo depois de 25 dias.
- Cidades de lançamento: Curitiba, Recife e João Pessoa (onde ele tem gente para avaliar os primeiros
  lugares). As outras quatro semeadas ficam prontas para quando chegar usuário.
- Layout do Início decidido: painel (opção A do mockup).
- Ficha das lojas pronta em docs/lojas.md.
- Foto dos lugares via Google Places (New) com cota travada no gratuito: migration 9, script
  `scripts/google-place-photos.mjs`, componente `PlacePhoto` (cai no ícone da categoria sem foto).
  Setup e limites em docs/fotos.md. Sem `EXPO_PUBLIC_GOOGLE_MAPS_KEY` o app não pede foto.
- Aba **Lugares** (`app/(tabs)/lugares.tsx`): busca por nome, filtro por categoria, ordem por
  distância. Entrou no lugar de Registrar na barra (a rota `/registrar` segue viva, escondida;
  os botões vermelhos do Início e do Mapa levam nela). Ficha do lugar: foto, alerta de relatos
  antes da nota, "Quanta cor tem esse lugar?" abrindo a seção do acolhimento, "Como chegar"
  (app de mapas do celular) no lugar do mini-mapa, formulário aberto só sem nota, denúncia no fim.

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
set -a && source .env.scripts && set +a           # carrega SUPABASE_SERVICE_ROLE_KEY e GOOGLE_MAPS_API_KEY
node scripts/import-neighborhoods.mjs <ibge>
node scripts/import-places-osm.mjs 4106902 --limite 60
node scripts/google-place-photos.mjs --todas         # fotos do Google, cota travada (docs/fotos.md)
bash scripts/screenshots.sh                          # prints das lojas no Simulador
```

Sem o Mac (pelo celular): GitHub → Actions → **Importar cidade** → Run workflow. Pede o código IBGE e
roda bairros, lugares e fotos com as chaves guardadas nos Secrets do repositório
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`).

Checks antes de commitar: `npm run lint && npm run typecheck`. Migrations testáveis localmente com `scripts/db-smoke.sh`.

## Próximos passos (em ordem)

1. Teste fechado no Google Play: manter 12 testadores opted-in por 14 dias seguidos e depois
   "Solicitar acesso à produção". A versão 8 já está em revisão.
2. Fonte alternativa de bairros para Brasília, São Luís, Palmas e São Paulo (OSM não cobre).
3. Implementar ocultar autor (bloqueio por usuário). Hoje não existe: no IARC está declarado **Não**,
   e a Apple exige pela regra 1.2. Ao implementar, atualizar a resposta do questionário na mesma versão.
4. Apple Developer (US$99/ano) quando decidir publicar no iOS; ou via ONG parceira (Apple isenta ONGs).
   Denúncia, moderação e excluir conta já existem.
5. Fase 6+: notificações por área, rotas seguras, versão web.

## Armadilhas já resolvidas (não repetir)

- Overpass devolve 406 sem Content-Type/User-Agent; script já tem 3 mirrors.
- `st_makevalid` pode gerar GeometryCollection: usar `st_collectionextract(..., 3)`.
- Bairro é atribuído no insert do relato; após importar bairros, rodar o UPDATE de reprocessamento (supabase/README.md).
- Xcode: nunca aplicar "Update to recommended settings"; Personal Team some após `prebuild --clean`; erro
  "Missing package product MapLibre" no Xcode GUI, mas `expo run:ios --device` no terminal compila.
- MapLibre usa LngLat como `[lng, lat]`. Câmera enquadra dados só no primeiro carregamento (`CityMap.tsx`).
- ESLint proíbe setState em effect: usar estado derivado ou useQuery.
- SQL Editor do Supabase mostra "No rows returned" em UPDATE bem-sucedido; confirmar com SELECT.
- A malha do IBGE recorta lagoa e recua a linha de costa: praia e orla ficam FORA do polígono do
  município. `resolve_occurrence_area` e `city_at` caem para o município mais próximo até 2 km
  (migration 8). Sem isso, relato na praia de Copacabana era recusado.
- `import-places-osm.mjs` tenta o insert em bloco e, se cair, grava um a um listando os recusados:
  um ponto ruim do OSM não pode derrubar a importação inteira.
- A chave de serviço fica em `.env.scripts` (fora do git, nunca no `.env` que o EAS empacota):
  `set -a && source .env.scripts && set +a` antes de rodar qualquer script de import.
- As variáveis do EAS são por ambiente: `env:push preview` não vale para `production`. Se o build não
  imprimir `EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL` carregadas, o app sai sem backend.
  Antes do primeiro build de produção: `npx eas-cli env:push production --path .env`.
