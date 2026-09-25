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
- Supabase projeto `ntjirpqulrnieeglpiei`, região São Paulo. Migrations 0–17 aplicadas (17 = prominence, colada em 25/09/2026)
  (10 a 15 coladas em 23/09/2026: anti-duplicata, initplan da RLS, relato do entorno não desconta
  nota, nível de atenção da região, onde/quando no relato, ficha do bairro). A 16 (inscrição de
  testadores pelo site) colada em 23/09/2026. Build 9 (versionCode 9) gerada
  no EAS em 23/09/2026 com o cartão anti-duplicata, onde/quando, ficha do bairro e o Início novo;
  subir na mesma faixa de teste fechado, sem mexer na lista de testadores.
  O seed fictício de Curitiba saiu do repositório; `supabase/seed/limpar-curitiba-teste.sql` apaga o que sobrou no banco.
- Chaves legadas desativadas: app usa `sb_publishable_...`, scripts usam `sb_secret_...` (só na máquina dele).
- Dados geográficos: os 5.570 municípios das 27 UFs e os bairros de 24 capitais importados do OSM.
  São Paulo saiu com 96 pelo nível 9 (`--nivel 9`, que lá são os distritos). Seguem sem bairro:
  Brasília, São Luís e Palmas — não existe no OSM em nenhum nível, e a API de malhas do IBGE recusa
  recorte abaixo do município ("intrarregiao NÃO aceita valores"), então `import-districts-ibge.mjs`
  só serve para listar nomes. Sem bairro o relato cai na cidade e o app funciona.
  `upsert_neighborhoods` agrupa nomes repetidos antes do upsert.
- Login: e-mail/senha OK, Google pelo navegador do sistema via Supabase (PKCE, cliente OAuth do tipo
  Aplicativo da Web) — não usa o SDK nativo, então SHA-1 não entra em nada; Apple nativo, só em builds
  EAS (`APP_ENV=preview|production`).
- Site público (GitHub Pages, workflow `pages.yml`, fonte `docs/*.md` → `scripts/build-site.mjs` → `site/`):
  https://alyssonfigueiredo.github.io/BEESAFE/ com privacidade.html, termos.html, pitch.html, mockup.html.
  A raiz é uma landing escrita à mão em `docs/index.html` (23/09/2026): hero escuro com a pergunta,
  seções Irisar / Registrar / regra da rua / emergência / anonimato / cidades / testar / ONGs, com as
  telas copiadas da apresentação. Chamada principal é o e-mail para entrar no teste (mailto) — trocar
  pelo link da Play Store quando o app sair em produção. Decisão dele: a página não fala em número de
  testadores nem em dias de teste (isso é assunto de quem desenvolve), só "em fase de testes" e o
  convite para ser das primeiras pessoas. Para não cansar, o detalhamento fica atrás de botões que
  abrem com animação (`.xp-btn` em grupo, um aberto por vez; `.xc` para cartões) — nada foi cortado,
  só guardado. Regra dele: não remover informação da página; se não couber, esconder atrás de botão.
  **Inscrição de testadores:** a página tem um formulário só com e-mail + Android/iPhone. Grava pela
  RPC `tester_signup` (migration 16) na tabela `tester_signups`, que não tem policy nenhuma — o site
  só consegue inserir, ninguém lê de fora. Ele lê no SQL Editor com `supabase/testadores.sql`
  (e-mails pendentes já separados por vírgula para colar na lista da Play Console; depois marca
  `added_at`). A chave `sb_publishable_` entra no build pela variável de Actions
  `SUPABASE_PUBLISHABLE_KEY` (Settings → Secrets and variables → Actions → aba Variables); o build
  recusa qualquer chave que não comece com `sb_publishable_`. Sem a variável, o botão cai no e-mail.
  Variável criada e formulário testado de ponta a ponta em 24/09/2026 (e-mail gravou).
  As telas, o radar e o desenho do mapa foram copiados do `pitch.html` para dentro do
  `docs/index.html`; mudanças na landing se fazem direto nesse arquivo.
  `docs/og.png` é a prévia de link (WhatsApp/Instagram), 1200×630, tirada do próprio hero.
  **Story de divulgação (24/09/2026):** `docs/story.html` é um story vertical 1080×1920 de 49 s no
  mesmo estilo da landing. Dez cenas: gancho em conversa de WhatsApp ("aquele bar novo é de boa pra
  gente?") → "E se a resposta já estivesse no mapa?" + marca → "Nesse bar pode / Nessa rua, de noite,
  não" → "Quanta cor tem aqui?" com a ficha do lugar → anel arco-íris enchendo até 4.7 "Acolhedor" →
  "Registrar leva um minuto" com 190/192/100/188 → "Sem nome. Sem perfil. Sem rastro." → "O lugar
  recebe cor / A rua recebe aviso" → as quatro cidades → "Já está no ar" + "Toque no link" com seta
  e uma área tracejada vazia onde ele cola o adesivo de link. **Sem endereço escrito no vídeo** (pedido
  dele: o link vai no adesivo). Animações são Web Animations presas a um relógio (`window.__setT(ms)`),
  e `node scripts/story-video.mjs` grava quadro a quadro em `docs/Irisa-story.mp4` (H.264, 30 fps;
  precisa de ffmpeg com libx264, `FFMPEG=` aponta outro binário). Sem áudio: a música entra no
  Instagram. Publicado em /story.html e /Irisa-story.mp4. A linha do tempo base tem 49 s e `?k=`
  estica só os inícios (não a velocidade das entradas): ele achou o texto rápido demais, então
  `MODE=story` (k 1.2245 → 60 s, máximo de um story sem cortar), `MODE=storybio` (60 s, fecho "O link
  está na bio" + @irisapp + cidades, `docs/Irisa-story-bio.mp4`) e `MODE=reels` (k 1.592 → 78 s, mesmo
  fecho, `docs/Irisa-reels.mp4`; Reels não aceita adesivo nem link na legenda). `?bio` na URL liga o fecho. Link camuflado: bit.ly/appirisa (conta dele) apontando para o site.
  **Carrossel de estreia:** `docs/carrossel.html` (8 lâminas 1080×1350, mesmo estilo) e
  `node scripts/carrossel-png.mjs` exporta `docs/carrossel/01..08.png`. Fecha com "O link está na bio".
  Segundo post: `docs/carrossel-2.html` ("Estrelas não dizem nada pra gente": as quatro perguntas com
  peso, nota e selo, fecho perguntando o último lugar que fez sentir bem-vinde), exportado com
  `node scripts/carrossel-png.mjs docs/carrossel-2.html` para `docs/carrossel-2/`. Decisão: a capa
  do carrossel de estreia é o gancho da conversa, não a logo (a marca fica no rodapé de toda lâmina).
  **Palavra da marca: "bem-vinde"** (decisão dele em 24/09/2026): a frase "O mapa dos lugares onde a gente
  é bem-vinde, feito por nós" está na bio do Instagram, no hero da landing e no painel do Início do app.
  Não listar categorias ("bar, café e balada") como se fossem tudo: hotel e restaurante são a maioria.
- Nove cidades semeadas com lugares reais do OSM (bar/café/restaurante/balada/hotel), sem nota e sem selo,
  só para o mapa não abrir vazio. Desde 24/09/2026 (`--limite 200`): Curitiba 256, Recife 119, João Pessoa 43
  (o OSM não tem mais nada lá nas nossas categorias — o resto entra por usuário), Joinville 180 (IBGE 4209102),
  Natal 199 (2408102), São Paulo 280 (3550308), Rio 284 (3304557), Salvador 63, Porto Alegre 60. A tag `lgbtq` do OSM quase não existe no Brasil (1 lugar em Curitiba):
  a lista da cena tem que vir do usuário, conferida um a um.
  **Overture Maps (24/09/2026):** o OSM ficou pobre e ele não quer depender de usuário cadastrando lugar.
  `scripts/import-places-overture.mjs <ibge>` lê a base aberta do Overture (Meta/Microsoft/Amazon/TomTom,
  licença CDLA-Permissive 2.0, release mensal; muita coisa vem das páginas do Facebook) direto do S3
  público, só os blocos Parquet que cruzam a caixa do município (hyparquet, JS puro, ~30 s por capital).
  Polígono do município vem da API de malhas do IBGE; filtra pela taxonomia (bar/balada/café/restaurante/
  hotel; motel entra como hotel, padaria e sorveteria como café, casa noturna adulta fica fora), confiança
  ≥ 0.5 (`--confianca`), tira repetidos a 150 m e o que já existe no banco com nome igual a 150 m. Sem
  `--limite` entra tudo: Curitiba dá ~10.700 candidatos (vs. 256 do OSM). `--simular` só conta, sem chave.
  `gay_bar` do Overture só dá prioridade, não vira rótulo. Atribuição das fontes está nos termos (item 12).
  No workflow Importar cidade o Overture é o padrão e o OSM ficou desligado. Fotos: cada lugar novo entra
  na fila do Google (150/dia), então uma capital inteira leva meses de cota — aceito, cai no ícone.
  **Fila de fotos por relevância (migration 17, 25/09/2026):** `places.prominence` (0–100 = confiança do
  Overture ×60 + site 15 + redes 15 + telefone 10) é gravada na importação e por
  `import-places-overture.mjs <ibge> --atualizar` (só preenche quem já está no banco). O script de fotos
  ordena avaliados primeiro, depois prominence, revezando as cidades (o 1º de cada, depois o 2º…);
  `--todas --listar` mostra os 150 do dia sem gastar cota. A coluna não aparece no app nem entra em nota.
  Popularidade real (nº de avaliações do Google) é campo Enterprise e não pode ser guardado. Decidido não exibir rótulo LGBTQIA+ na ficha
  (lista pública vira alvo); o selo vem dos quatro eixos de acolhimento.
- Decidido lançar primeiro no Android. iOS fica para depois do primeiro retorno da Play Store.
- Play Console: versão 8 (0.1.0) enviada para revisão na faixa de teste fechado em 22/09/2026, com a
  ficha da loja, os prints e o gráfico de recursos. Falta a lista de testadores completar 12 pessoas
  por 14 dias seguidos antes de pedir produção. Apps da categoria Social exigem a declaração de
  padrões de segurança infantil (CSAE): política em `docs/seguranca-infantil.md`, publicada em
  /seguranca-infantil.html, contato appirisa@gmail.com.
- Fotos do Google por cidade (23/09/2026): Curitiba 51/60, Recife 48/60, João Pessoa 32/43,
  Joinville 114/180 (29 nunca tentados). Quem não casou fica sem foto e cai no ícone da categoria;
  o script só tenta de novo depois de 25 dias. A cota é 150 buscas/dia no projeto inteiro (app + script)
  e renova à meia-noite do Pacífico = **4h da manhã em Brasília** (rodar antes disso dá "cota esgotada").
  **Fila de fotos, um comando por dia** (cada um para sozinho quando a cota acaba e continua no dia seguinte).
  Depois dos imports de 24/09 há ~1.100 lugares sem foto (uma semana e meia de cota): 25/09 `2507507` e
  `4106902`; 26/09 `4106902` de novo; 27/09 `2611606`; 28/09 `4209102`; depois `2408102`, `3550308`, `3304557`.
- Cidades de lançamento: Curitiba, Recife, João Pessoa e Joinville (onde ele tem gente para avaliar os
  primeiros lugares). Em 24/09/2026 ele decidiu somar Natal, São Paulo e Rio (lugares com `--limite 200`,
  fotos na fila, serviços no seed). As outras semeadas ficam prontas para quando chegar usuário.
- Captação: a apresentação (docs/pitch.html + docs/Irisa-apresentacao.pdf, 17 slides desde 23/09/2026:
  capa com a pergunta em arco-íris, slide de abertura em conversa, acolhimento e registro (tipos, emergência, apoio) antes das telas, slide da
  regra “o lugar recebe cor, a rua recebe aviso” com a ficha do bairro, e slide de proposta para ONGs)
  é usada para atrair usuário, ONG/coletivo e testador — o fecho traz contato e convite.
  O mesmo `pitch.html` é a versão animada no navegador (letras e palavras entrando, halos nos slides
  escuros, percentuais contando, pinos do mapa em sequência, radar girando, celulares flutuando,
  barra de progresso, tecla **A** ou `?auto=8` para autoplay). O PDF é gerado com `?static`, que
  desliga tudo isso; `prefers-reduced-motion` também desliga. Mensagem de convite aos testadores pede só o
  e-mail da conta Google do Android; o link de participação só depois da versão publicar na faixa.
  **O link que se manda ao testador é o de participação, não o da loja:**
  https://play.google.com/apps/testing/br.com.irisa.app (Teste fechado → Testadores → "Participar na
  Web"). A pessoa toca em "Tornar-se testador" e só então o link da loja abre. Se o de participação
  também der "não encontrado", a versão não está "Disponível para testadores": olhar Visão geral da
  publicação (mudanças não enviadas, ou publicação gerenciada segurando a versão aprovada).
  **Lista de testadores também passa por revisão:** marcar/editar a lista numa faixa fechada é uma
  mudança que só vale depois de "Enviar mudanças para análise" e aprovada. Em 23/09/2026 a versão 8
  estava no ar mas a lista nunca tinha sido enviada — todo testador via "App not available … for this
  account". Enviada às 19h30 junto com a versão 9; aprovada e **app disponível para os testadores
  desde 24/09/2026** (contar os 14 dias a partir de quando 12 pessoas tiverem aceitado). O link "internal test version … shared with you" é
  do compartilhamento interno (não conta para os 12) e exige ativar o recurso na Play Store do celular
  (Configurações → Sobre → tocar 7× na versão → Geral → Compartilhamento interno de apps).
  Meta de 20 a 25 testadores (o mínimo do Google é 12, e cair abaixo disso reinicia os 14 dias).
- Layout do Início decidido: painel (opção A do mockup). Desde 23/09/2026 o painel abre com
  “Sua cidade” e dois botões do mesmo tamanho — **Avaliar um lugar** (turquesa) e **Registrar relato**
  (coral): avaliar é o uso de toda semana, registrar é o uso que ninguém quer precisar, e nenhum
  dos dois pode parecer secundário. A seção de lugares subiu para antes do bloco de segurança, que
  ganhou título próprio (“Segurança na cidade”) para ser metade deliberada e não sobra.
  Enquanto ninguém tem as 5 avaliações do ranking, a seção mostra quem já recebeu alguma nota;
  sem nenhuma, mostra a chamada para avaliar o primeiro lugar.
- **Confiança da região (migration 13):** `place_scores.area_level` é `atencao` (1 a 3) ou `alerta`
  (4+) pelo peso `total + 3 × graves` dos relatos a 100 m em 180 dias — o mesmo peso de
  `area_risk_ranking`. **Nunca existe nível “tranquila”**: com poucos usuários, ausência de relato é
  ausência de gente registrando, e dizer “região segura” seria a falha mais perigosa possível.
  Componente `AreaLevel` (`sm` no cartão, `lg` na ficha).
- **O alerta de relato é da rua, não do estabelecimento.** Ele acontece no beco, na praça, no ponto
  de ônibus. No cartão do lugar ele aparece como contexto (“Relato de LGBTIfobia por perto”,
  também em lugar sem nota, que é o caso mais comum); no Mapa aparece como área. **Não criar filtro
  de lugares por alerta**: faria a violência parecer atributo do bar e puniria quem só está perto.
- Ficha das lojas pronta em docs/lojas.md.
- Serviços de apoio por cidade em `supabase/seed_services.sql`, já no banco: nacionais + Curitiba,
  Porto Alegre e, desde 23/09/2026, Recife, João Pessoa e Joinville; em 24/09/2026 entraram São Paulo (5 Centros
  de Cidadania LGBTI, um por região), Rio (Disque Cidadania LGBT 0800 023 4567 + Centro Capital I) e Natal
  (Centro Municipal de Cidadania LGBT). Os telefones municipais (Recife, João Pessoa, SP, Rio e Natal)
  vieram de página oficial mas **ainda não foram confirmados por ligação** — telefone errado em app de
  segurança é pior que telefone ausente. Joinville não tem centro de referência municipal: entraram a
  UNA LGBT e a Comissão da Diversidade da OAB. Reconferir os contatos a cada seis meses.
- Foto dos lugares via Google Places (New) com cota travada no gratuito: migration 9, script
  `scripts/google-place-photos.mjs`, componente `PlacePhoto` (cai no ícone da categoria sem foto).
  Setup e limites em docs/fotos.md. Sem `EXPO_PUBLIC_GOOGLE_MAPS_KEY` o app não pede foto.
- Anti-duplicata de lugar (migration 10): trigger barra insert com nome parecido (trigram > 0.6,
  tolerante a acento e caixa) a menos de 150 m de um lugar ativo; a RPC `places_similar` devolve os
  parecidos num raio de 300 m e o `PlaceForm` mostra o cartão de aviso antes de enviar. O bloqueio já
  vale para a build 8 (é no banco); o cartão e o link abrindo direto na aba Lugar só na build 9.
- Relato tem **onde** (`setting`: rua, praça, transporte, dentro de um lugar, serviço público, outro)
  e **quando** (`period`: madrugada, manhã, tarde, noite), migration 14. Os dois são **opcionais de
  propósito**: quem registra acabou de passar por violência, e exigir classificação nesse momento é
  atrito no pior momento. Campo que não existe na hora do registro não pode ser preenchido depois —
  foi por isso que entraram antes do teste começar.
- **Ficha do bairro** (`app/bairro/[id].tsx`, migration 15): a tela onde os dois lados se encontram.
  Resumo da área (total, graves, contagem por tipo/onde/quando), lugares do bairro (avaliados
  primeiro) e relatos do bairro. Chega pelo ranking do Início e pelo bairro da ficha do lugar.
  Sem relato, a tela diz que isso **não** significa área segura — significa que ninguém registrou.
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
Ranking de acolhimento: média bayesiana (m=5, priors por categoria), meia-vida 6 meses, penalidade SÓ por
relato que aponta o lugar (`occurrences.place_id`), selos poucas/atencao/dividido/acolhedor/bem, mínimo 5
avaliações. Relato no entorno de 100 m aparece como contexto de região e NÃO desconta nota (migration 12). Obfuscação ~100 m só para relatos de hoje/ontem.

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
node scripts/import-districts-ibge.mjs 3550308     # bairros pelos distritos do IBGE (onde o OSM não cobre)
node scripts/import-places-osm.mjs 4106902 --limite 60
node scripts/import-places-overture.mjs 4106902          # Overture Maps, tudo com confiança ≥ 0.5 (--simular só conta)
node scripts/google-place-photos.mjs --todas         # fotos do Google, cota travada (docs/fotos.md)
bash scripts/screenshots.sh                          # prints das lojas no Simulador
node scripts/pitch-pdf.mjs                           # regera docs/Irisa-apresentacao.pdf a partir de docs/pitch.html
```

Sem o Mac (pelo celular): GitHub → Actions → **Importar cidade** → Run workflow. Pede o código IBGE e
roda bairros, lugares e fotos com as chaves guardadas nos Secrets do repositório
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_API_KEY`).

Checks antes de commitar: `npm run lint && npm run typecheck`. Migrations testáveis localmente com `scripts/db-smoke.sh`.

## Próximos passos (em ordem)

1. Teste fechado no Google Play: manter 12 testadores opted-in por 14 dias seguidos e depois
   "Solicitar acesso à produção". A versão 8 já está em revisão.
2. Bairros de Brasília, São Luís e Palmas — tem que existir fonte, o OSM é que não cobre. Pistas
   ainda não testadas: (a) malha de setores censitários do Censo 2022 no geoftp do IBGE, que traz
   nome de bairro por setor e dá para dissolver por nome; (b) GeoPortal da Seduh/DF para as regiões
   administrativas; (c) dados abertos das prefeituras de São Luís e Palmas (em Palmas a cidade é
   organizada em quadras, não bairros — o nome do "bairro" ali pode ser a quadra).
3. Implementar ocultar autor (bloqueio por usuário). Hoje não existe: no IARC está declarado **Não**,
   e a Apple exige pela regra 1.2. Ao implementar, atualizar a resposta do questionário na mesma versão.
4. Apple Developer (US$99/ano) quando decidir publicar no iOS; ou via ONG parceira (Apple isenta ONGs).
   Denúncia, moderação e excluir conta já existem.
5. Fase 6+: notificações por área, rotas seguras, versão web.

## Armadilhas já resolvidas (não repetir)

- O aviso "Security Definer View" do linter da Supabase nas views `public_*` é proposital, não bug:
  as tabelas-base não têm policy de leitura para usuário comum, e a view é o único caminho — ela
  esconde `created_by`, filtra `status = 'active'` e arredonda coordenada recente. Não converter
  para `security_invoker`, o app pararia de ler.
- O ambiente `github-pages` tinha regra de proteção que só aceitava deploy da branch padrão: todo push
  da branch de trabalho falhava em 3 s ("not allowed to deploy to github-pages due to environment
  protection rules") e o site ficou congelado de 18/09 a 23/09 — inclusive a página de segurança
  infantil declarada ao Google. Corrigido em Settings → Environments → github-pages → Deployment
  branches. Depois disso o **Source** em Settings → Pages estava em “Deploy from a branch”: o GitHub
  publicava a raiz do repositório por cima do nosso deploy (“pages build and deployment” rodava a cada
  push e o site alternava entre no ar e 404). Tem que ser **GitHub Actions**. E no Run workflow manual,
  escolher a branch de trabalho — o menu vem na branch padrão, que é a antiga. Se o site parar de
  atualizar, olhar primeiro em Actions → Pages se o run está verde e se não há “pages build and
  deployment” rodando junto.
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
  um ponto ruim do OSM não pode derrubar a importação inteira. Desde 23/09/2026 o script NÃO exige
  `addr:street`: no Brasil a maioria dos bares do OSM tem nome e ponto mas não rua, e exigir a rua
  descartava a maior parte do acervo. Endereço entra quando existe. Atenção: com a migration 10 no ar,
  o trigger anti-duplicata pode recusar pontos de nome parecido a menos de 150 m (rede com duas lojas
  perto, por exemplo) — eles aparecem na lista de recusados do script, e isso é o comportamento certo.
- A chave de serviço fica em `.env.scripts` (fora do git, nunca no `.env` que o EAS empacota):
  `set -a && source .env.scripts && set +a` antes de rodar qualquer script de import.
- No Play Console, NÃO marcar "Emergência e primeiros socorros" em Recursos de saúde. O botão de
  emergência só disca 190/192/100/188: não é recurso de saúde. Marcado, o app cai na regra de "só
  organização distribui" e é recusado (aconteceu em 22/09/2026, versão 8).
- As variáveis do EAS são por ambiente: `env:push preview` não vale para `production`. Se o build não
  imprimir `EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL` carregadas, o app sai sem backend.
  Antes do primeiro build de produção: `npx eas-cli env:push production --path .env`.
