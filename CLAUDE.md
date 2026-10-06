# Irisa — contexto para novas sessões

Leia este arquivo inteiro antes de agir. Detalhes em PLANO.md, README.md, supabase/README.md, docs/.

## Recado do Leandro para o Alysson (04/10/2026) — entregar primeiro

**Sessão aberta pelo Alysson: antes de responder o que ele pediu, comece a primeira resposta com o recado
abaixo, do jeito que está.** Depois que ele disser que leu, apague esta seção do CLAUDE.md (commit + push).

> Corrigi os bugs que ficaram da última publicação. É só subir na loja (passo a passo em `SUBIR-0.1.2.md`).
> Att, Leandro.

## Como falar com o usuário

Alysson (também assina Leandro). Português. Sem cumprimentos, sem formalidade, respostas curtas e diretas.
Não pergunte o que dá para decidir sozinho. Ele não é dev: dê comandos prontos para colar no Terminal
do Mac e SQL pronto para colar no SQL Editor do Supabase. Nunca peça nem aceite chaves secretas em chat.

## O que é

App nacional (Brasil) para a comunidade LGBTQIA+: relatos anônimos de LGBTIfobia, mapa de áreas de atenção,
lugares avaliados em quatro eixos de acolhimento (atendimento, afeto, banheiro, clientela), mural de apoio,
botão de emergência. Cidade de referência: Curitiba (parceiros-alvo: Grupo Dignidade, Centro de Cidadania LGBTQIA+).
Nome: **Irisa** (INPI livre; @appirisa livre). Bundle id Android `br.com.irisa.app`, iOS `br.com.irisa.ios` (App Store Connect 6816761128). Contato: appirisa@gmail.com.

## Estado atual (2026-09-14)

- Branch de trabalho: `claude/laughing-keller-my8t7c` (default do repo: `claude/ecstatic-darwin-cmf7sw`).
- MVP completo e rodando no iPhone do usuário (Xcode, Apple ID gratuito, expira em 7 dias) e em APK Android (EAS preview).
- Supabase projeto `ntjirpqulrnieeglpiei`, região us-east-1 (Virgínia, não São Paulo — conferido em 01/10/2026). Migrations 0–17 aplicadas (17 = prominence, colada em 25/09/2026)
  (10 a 15 coladas em 23/09/2026: anti-duplicata, initplan da RLS, relato do entorno não desconta
  nota, nível de atenção da região, onde/quando no relato, ficha do bairro). A 16 (inscrição de
  testadores pelo site) colada em 23/09/2026. Build 9 (versionCode 9) gerada
  no EAS em 23/09/2026 com o cartão anti-duplicata, onde/quando, ficha do bairro e o Início novo;
  subir na mesma faixa de teste fechado, sem mexer na lista de testadores.
  O seed fictício de Curitiba saiu do repositório; `supabase/seed/limpar-curitiba-teste.sql` apaga o que sobrou no banco.
- **Migration 18 (perfil robusto, 27/09/2026, achado no TestFlight):** `update_my_profile` virou
  `security definer`, cria a linha de `profiles` se faltar (antes só fazia UPDATE e, sem linha, não
  salvava nem dava erro), valida apelido ≤ 40 e cidade; `ensure_my_profile()` é o que o app usa para
  ler o perfil. O app confere depois de salvar se o apelido gravou mesmo, e o mural já vem com o
  apelido do Perfil. Erros de login/cadastro em português em `src/lib/authErrors.ts`.
  **Apple com bundle `br.com.irisa.ios`:** o token da Apple vem com esse bundle como audiência; na
  Supabase (Authentication → Sign In / Providers → Apple → Client IDs) têm que estar os dois,
  `br.com.irisa.ios,br.com.irisa.app`, senão dá "Unacceptable audience in id_token".
  Passo a passo de publicação no iPhone para o Alysson: `PUBLICAR-IOS.md` na raiz (fora de `docs/`
  de propósito, para não ir para o site).
- **Limite de e-mail no cadastro (29/09/2026):** o SMTP embutido da Supabase manda só 2 e-mails por
  hora no projeto inteiro; com "Confirm email" ligado, o 3º cadastro por e-mail na hora dá "email rate
  limit exceeded" (no app: "Chegamos ao limite de e-mails de confirmação por hora"). Solução: SMTP próprio
  em Authentication → Emails → SMTP Settings com o Gmail da Irisa (smtp.gmail.com, 465, appirisa@gmail.com,
  a mesma senha de app do `tester-welcome`) e depois subir o limite em Authentication → Rate Limits. Para
  gravar tela, dá para desligar "Confirm email" temporariamente. `src/lib/authErrors.ts` separa os três
  limites (por hora, "espere N segundos" do mesmo e-mail, e requisições da mesma rede).
  SMTP próprio configurado por ele em 29/09/2026. Site URL da Supabase é `irisa://auth/callback` (fica
  assim); o `signUp` manda `emailRedirectTo` para o mesmo endereço e `app/auth/callback.tsx` troca o
  código pela sessão, então tocar no link do e-mail no mesmo celular já entra na conta. Em outro aparelho
  a conta fica confirmada e a pessoa entra pelo login. `irisa://auth/callback` tem que continuar em
  Redirect URLs (o login com Google depende dele).
- **Limite de avaliações 50/dia (migration 25, aplicada no banco em 30/09/2026):** antes era 10. Só muda
  `enforce_rate_limit` no banco, sem build. A 24 já foi ajustada para não voltar a 10 se for colada depois.
- **Avaliação sem limite para a equipe (migration 26, 30/09/2026, aplicada):** tabela `rate_limit_exempt`
  (sem policy; entra pelo SQL Editor, sem e-mail no repo). Liberadas as 7 contas do Alysson e do Leandro
  (e-mails começando com `alysson`/`leandro`). As contas da Irisa (appirisa, irisateste) seguem com limite.
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
  **E-mail automático de boas-vindas (migration 22 + Edge Function `tester-welcome`, 28/09/2026):** a cada 10 min
  o pg_cron chama a função, que manda pelo Gmail da Irisa (SMTP 465, senha de app) o link de participação +
  o da loja para quem tem `added_at` e ainda não tem `welcomed_at`. Só marcar `added_at` DEPOIS que a lista
  foi aprovada na Play Console. iPhone só recebe quando existir o secret `TESTFLIGHT_URL` (link público).
  Secrets: `TESTER_WELCOME_SECRET` (o mesmo no Vault como `tester_welcome_secret`), `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
  As telas, o radar e o desenho do mapa foram copiados do `pitch.html` para dentro do
  `docs/index.html`; mudanças na landing se fazem direto nesse arquivo.
  `docs/og.png` é a prévia de link (WhatsApp/Instagram), 1200×630, tirada do próprio hero.
  **Landing refeita em 01/10/2026 na estética nova** (a mesma do app e do Instagram, `base.css` da skill
  irisa-posts): papel com as quatro manchas de cor, cartões de vidro, Oswald 700 caixa alta com parte
  leve em 400 e linhas quebradas à mão, botões em cápsula, `#radarmin` na marca. Sem seção escura
  inteira: o único bloco escuro é o cartão da emergência. As telas são as reais do app (renders do
  protótipo, `docs/telas/*.webp`, copiadas pelo `build-site.mjs`), em celulares inclinados que entram
  girando. **iOS está na App Store** (https://apps.apple.com/br/app/irisa/id6816761128): botão
  "Baixar na App Store" no hero, no bloco Baixar e no rodapé; o formulário de teste agora é só do
  Android (`p_platform` sempre `android`), e `#testar` continua existindo para links antigos.
  Seção de cidades diz "O Brasil todo no mapa" (funciona em qualquer cidade) e lista as sete como "Começando por". Nada de conteúdo saiu: o detalhe segue atrás dos botões que abrem.
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
  está na bio" + @appirisa + cidades, `docs/Irisa-story-bio.mp4`) e `MODE=reels` (k 1.592 → 78 s, mesmo
  fecho, `docs/Irisa-reels.mp4`; Reels não aceita adesivo nem link na legenda). `?bio` na URL liga o fecho. Link camuflado: bit.ly/appirisa (conta dele) apontando para o site.
  **Abertura para vídeo (27/09/2026):** `docs/abertura.html` é o radar do splash sozinho, em HTML+CSS
  (360×640 escalado ×3), com `?formato=story|quadrado`, `?bg=paper|night|verde` (chroma) e `?semfim`;
  `node scripts/abertura-video.mjs` grava em MP4 (`V=`, `FORMATO=`, `BG=`). `?v=radar` (4,2 s, o que
  está no app), `?v=1` (coração da apresentação → espiral arco-íris enche a tela → círculo branco abre →
  radar, 8 s), `?v=2` (radar → o anel se expande e a tela vira arco-íris com IRISA em branco e borda de 5 px no olho, as cores saem pela mesma varredura e termina no branco, 7,9 s).
  `?v=3` (teste pedido por ele: coração → varredura enche a tela → as cores saem
  pela varredura enquanto o radar da logo pinta o anel no mesmo passo, termina no branco, 7,9 s).
  `docs/abertura-rever.html` mostra as versões lado a lado com Reiniciar. Escolhida para o app: v2 (27/09), também
  aplicada no protótipo (`docs/prototipo-ios27.html`, aparelho da proposta) antes do tour.
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
  **Todas as 27 capitais com Overture desde 30/09/2026** (154 mil lugares ativos): as 8 que faltavam
  entraram pelo Mac dele — Florianópolis 4.414, Campo Grande 3.510, Cuiabá 2.077, São Luís 1.912,
  Porto Velho 1.486, Boa Vista 882, Palmas 816, Rio Branco 724. Rio Branco tem 1 bairro só no banco
  (lugares ficam sem bairro, como em São Luís e Palmas). Nível 9 do OSM lá é o distrito inteiro ("Rio Branco",
  apagado em 30/09); o nível 10 deu Overpass 504 duas vezes — tentar de novo em outro horário e, se entrar,
  rodar o UPDATE de reprocessamento de `places` do supabase/README.md.
  **Itapeva/SP (3522406) em 02/10/2026:** 256 lugares do Overture, inseridos pela sessão cloud via SQL
  (sem chave de serviço lá: o script rodou com `--simular` e despejou os candidatos). Fora 5 que não são
  lugar (igreja marcada como balada, academia, salão de beleza, motorista de Uber, banda). Sem bairro: o OSM
  não tem nível 10 lá e o nível 9 deu timeout no Overpass.
  **Grande João Pessoa em 02/10/2026** (mesmo caminho de Itapeva): Bayeux 89, Santa Rita 105 e Conde 93
  (Jacumã, Carapibus, Tabatinga, Coqueirinho, Tambaba — quase metade é pousada). Tirados nome repetido na
  mesma cidade e o que não é lugar (depósito de bebidas, xerox, residencial, hotel de Campina Grande).
  Bairros do OSM no mesmo dia (polígonos simplificados a ~10 m e gravados por `upsert_neighborhoods` via SQL):
  Bayeux 12 (84 de 89 lugares com bairro), Santa Rita 19 (94 de 105), Conde só Jacumã (27 de 93) — o resto
  do litoral de Conde não tem bairro no OSM, e o distrito "Conde" do nível 9 cobria a costa toda, então ficou fora.
  No workflow Importar cidade o Overture é o padrão e o OSM ficou desligado. Fotos: cada lugar novo entra
  na fila do Google (150/dia), então uma capital inteira leva meses de cota — aceito, cai no ícone.
  **Fila de fotos por relevância (migration 17, 25/09/2026):** `places.prominence` (0–100 = confiança do
  Overture ×60 + site 15 + redes 15 + telefone 10) é gravada na importação e por
  `import-places-overture.mjs <ibge> --atualizar` (só preenche quem já está no banco). O script de fotos
  ordena avaliados primeiro, depois prominence, revezando as cidades (o 1º de cada, depois o 2º…);
  `--todas --listar` mostra os 150 do dia sem gastar cota. A coluna não aparece no app nem entra em nota.
  **Foto própria pelo Mapillary (migration 23 + `scripts/mapillary-photos.mjs`, 28/09/2026, aplicada
  no banco):** a foto do Google não pode ser baixada, vence em 30 dias e gasta cota (150/dia no
  projeto inteiro), então uma capital leva meses. O Mapillary publica as imagens em CC BY-SA 4.0: dá para
  baixar, guardar e mostrar com crédito. O script pega a imagem a até 60 m com a câmera apontada para o
  lugar (desvio ≤ 55°), sobe para o Cloudflare R2 (10 GB grátis, sem custo de saída) e grava `photo_url`.
  Sem cota: roda tudo de uma vez. Precedência no app: foto própria → Google → azulejo da categoria.
  Chaves em `.env.scripts` (`MAPILLARY_TOKEN`, `R2_*`), passo a passo em docs/fotos.md. **Conta do
  Cloudflare é só da Irisa** (appirisa@gmail.com, criada em 28/09/2026): separada da conta pessoal
  dele para não dividir cota nem cobrança com outro projeto, e para o dia em que a Irisa mudar de
  mãos bastar entregar o e-mail. Mesma regra vale para o Mapillary.
  Bucket `irisa-fotos`, leitura pública pela Public Development URL `https://pub-70bc82c84169407ea7e964b1d73cbdc5.r2.dev`
  (o `r2.dev` é grátis mas tem velocidade limitada; trocar por domínio próprio quando o app
  tiver movimento). **Nunca raspar
  foto do Google Maps para guardar**: é proibido nos termos, as fotos são de quem as tirou, e denúncia
  derruba o app da loja.
  **Foto de quem avalia (migration 24, 28/09/2026, aplicada no banco; função `photo-check` e cron publicados em 30/09/2026.
  Chave do cron só no Vault (migration 26, RPC `photo_check_autorizado`). Foto na fila → e-mail para appirisa@gmail.com.
  Sem `VISION_API_KEY` por decisão dele (30/09/2026): toda foto passa pela aprovação dele; a chave fica para quando o volume pedir):** bucket público
  `fotos-lugares` no Storage (`<place_id>/<user_id>/foto.jpg`, o uid na pasta impede sobrescrever a
  foto alheia e nunca sai do banco), tabela `place_photos` com RLS e rate limit de 10/dia, trigger que
  põe a mais recente ativa em `places.photo_url` com `photo_source='usuario'` e volta para a foto
  anterior quando a moderação esconde. Denúncia de foto entra no fluxo existente (`report_target`
  ganhou `photo`). No app: botão dentro do formulário de avaliação (`src/hooks/usePlacePhoto.ts`).
  **Nenhuma foto entra no ar sozinha:** nasce `review='pendente'`; a Edge Function `photo-check`
  (pg_cron 5 em 5 min) passa pelo SafeSearch do Cloud Vision (1.000/mês grátis) e marca aprovada /
  recusada / `humano` (**decisão dele, 30/09/2026: só aprova sozinho com as três notas em
  `VERY_UNLIKELY`; qualquer sinal de dúvida vai para a fila**); a fila humana fica na tela Moderação (`fotos_para_moderar` + `moderar_foto`,
  sem mostrar quem mandou). Sem `VISION_API_KEY` nada é aprovado sozinho — o padrão é não publicar.
  Secrets: `VISION_API_KEY` (opcional); `GMAIL_*` e `SB_SECRET_KEY` já existem.
  **`expo-image-picker` é nativo: precisa de `npx expo run:ios --device` e de build EAS nova.**
  Ordem final da foto: quem avaliou → Mapillary → Google → azulejo da categoria.
  Popularidade real (nº de avaliações do Google) é campo Enterprise e não pode ser guardado. Decidido não exibir rótulo LGBTQIA+ na ficha
  (lista pública vira alvo); o selo vem dos quatro eixos de acolhimento.
- Decidido lançar primeiro no Android. iOS fica para depois do primeiro retorno da Play Store.
  **iOS APROVADO e no ar na App Store em 01/10/2026** (dito por ele). A partir daqui o link do iPhone
  existe e pode ir para a bio, para a landing e para o e-mail de boas-vindas — hoje tudo ainda aponta
  só para o teste do Android. Link público do TestFlight pedido, esperando a revisão beta: quando sair, gravar
  `TESTFLIGHT_URL` e marcar `added_at` dos 9 inscritos de iPhone (todos os pendentes de `tester_signups` em 30/09). A branch principal `claude/ecstatic-darwin-cmf7sw` fica
  sempre igual à de trabalho, pronta para a próxima versão subir com tudo (roteiro em `SOLTAR-OUTUBRO.md`).
- **Build 0.1.1 enviada nos dois sistemas em 02/10/2026; iOS em revisão na Apple e Android em revisão na Play Console (dito por ele).** O que está no ar hoje: iOS 0.1.0 na App Store (público) e Android em teste fechado. iOS: build 8, `eas submit`
  feito, esperando o processamento do TestFlight. Android: AAB enviado na faixa de teste fechado,
  **com a resposta do IARC sobre bloquear/ocultar outros usuários já mudada para Sim** — era a
  pendência que segurava essa build. É a primeira versão dos dois lados com o **EAS Update ligado**:
  daqui pra frente correção de JS/tela sai por `npx eas-cli update --branch production`, sem gastar
  build. **O `runtimeVersion` segue a versão do app (`appVersion`), então update vale para quem tem
  0.1.1** — quem ficar na 0.1.0 (a que está na App Store desde 01/10) não recebe nada até atualizar.
  O que vai nela: as correções de 01 e 02/10 (tela presa ao cadastrar lugar, endereço virando ponto
  no mapa, busca de lugar no banco, aviso de repetido na cidade), foto de perfil, bloqueio de
  usuário, foto do Mapillary, envio de foto ao avaliar, fila de moderação de imagem, layout novo
  com as animações. Pendência conhecida que foi junto: o fundo branco quadrado da aba ativa na barra
  de baixo (é JS, sai por update).
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
- **Rejeição da Apple 2.1 (28/09/2026), versão 0.1.0 (3):** "Information Needed" — pediram vídeo de
  tela em aparelho real, descrição do app, instruções de acesso, serviços externos, diferenças por
  região e material de terceiros. Resposta pronta em `APPLE-REVISAO.md` na raiz: notas em inglês para
  colar no App Review Information → Notes e no Resolution Center, roteiro da gravação e conta de teste
  `appirisa+review@gmail.com`. O vídeo precisa mostrar denúncia **e** bloqueio, então só serve build
  com a migration 20 no app. Nas notas está explicado por que relato não tem botão de bloquear
  (é anônimo, não tem autor exibido) — a Apple cobra isso.
- **Excluir conta apagava as avaliações (migration 27, 01/10/2026, ainda não aplicada; achado ao investigar outro problema, não é a causa dele):** `place_ratings.user_id`
  era `on delete cascade`, então toda avaliação da pessoa sumia junto com a conta — e com ela a nota e o selo do
  lugar, sem ninguém ter mexido em nada. `occurrences.created_by`, `places.created_by` e `support_messages.created_by`
  sempre foram `on delete set null` (o conteúdo fica, o vínculo some); a avaliação é conteúdo da comunidade igual
  aos outros e passa a seguir a mesma regra. `user_id` vira nulável, `is_mine` ganha `coalesce(..., false)` e a
  avaliação órfã deixa de ter dono para editar ou apagar (só a moderação). **`place_photos` continua em cascade de
  propósito:** imagem pode mostrar a pessoa, e aí apagar é o certo. Diagnóstico pronto em `supabase/diagnostico.sql`.

- **Lugar cadastrado sumia da lista, da busca e do mapa (migration 28 + ordenação, 01/10/2026):**
  o "Na Feira Bar", criado pelo Leandro em Curitiba, não aparecia para o Alysson. Causa: `usePlaces`
  trazia `public_places` com `.limit(1000)` **sem `order by`**, e a busca por nome era filtro no
  celular sobre esse lote. Com 256 lugares em Curitiba cabia tudo; depois do Overture nas 27 capitais
  (154 mil lugares, ~10.700 só em Curitiba) o Postgres devolve 1.000 quaisquer, e o que fica de fora
  não existe para o app — a ficha nunca abre, então as avaliações daquele lugar somem junto. Correção:
  o lote passa a vir ordenado por `rating_count desc, created_at desc` (quem tem nota e quem acabou de
  entrar vêm primeiro) e a busca vai ao banco pela RPC `search_places` (migration 28, tolerante a
  acento e caixa pela mesma `place_name_key` do anti-duplicata). O contador do cabeçalho agora é o
  total real da cidade (`usePlaceCount`), não o tamanho do lote. **O Mapa ainda usa o mesmo lote**:
  quando a cidade crescer mais, ele precisa carregar por área visível, não os 1.000 primeiros.
  É mudança de JS: `npx expo start --dev-client` + `r` resolve no iPhone dele; para os testadores só
  com build nova ou EAS Update.

- **Bloqueio por usuário (migration 20, 28/09/2026, aplicada no banco no mesmo dia):** tabela `blocked_users` (RLS: cada um vê e apaga só os
  seus), RPCs `block_user`/`unblock_user`/`block_author(type, id)`. O app nunca recebe o id do autor
  (`created_by` não sai do banco), então bloqueia pelo id da mensagem/avaliação e o banco resolve.
  As views `public_support_messages` (ganhou `is_mine`) e `public_place_ratings` filtram o que vem de quem
  eu bloqueei. Relatos não entram: não têm autoria visível. `BlockButton` ao lado de Denunciar no mural e
  nas avaliações; lista "Pessoas bloqueadas" com Desbloquear em Perfil. Ao publicar a build com o botão,
  mudar a resposta do IARC (bloquear/ocultar outros usuários) para **Sim** — nunca antes.
- **Revogação do Sign in with Apple (migration 21 + Edge Functions, 28/09/2026; migration aplicada e funções publicadas no mesmo dia):** `socialAuth.ts` manda o
  `authorizationCode` do login para a função `apple-token`, que troca por refresh token e guarda em
  `apple_refresh_tokens` (só chave de serviço). Excluir conta chama a função `delete-account`: revoga na
  Apple e só então apaga o usuário; conta Apple nunca cai no fallback da RPC `delete_my_account`. Secrets:
  `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (.p8), `SB_SECRET_KEY`, opcional `APPLE_CLIENT_ID`.
  `app.config.ts` usa `br.com.irisa.ios` no iOS desde 28/09/2026 (igual ao App Store Connect, ID 6816761128);
  esse é o client_id da revogação. O provider Apple na Supabase precisa desse id em "Client IDs".
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

- **Paleta viva, profundidade e Liquid Glass (26/09/2026, branch `claude/amazing-volta-0wnzed`):** os acentos de
  `src/theme/tokens.js` são derivados da versão cheia (`accents`) com a saturação HSL multiplicada por
  `SATURATION = 1.35` (cor viva, teto em 100 %) — um número só muda o app inteiro (pastilhas, mapa, anel da marca). Cabeçalho, barra
  de abas (cápsula flutuante) e folha de emergência usam `src/components/Glass.tsx`: Liquid Glass de
  verdade no iOS 26+ (`expo-glass-effect`), blur com véu branco (`expo-blur`) no Android e iOS antigo.
  O conteúdo rola por baixo: toda tela de aba (e a ficha do lugar / moderação) usa
  `useScreenInsets()` no `contentContainerStyle` no lugar do `py-4`. Cartões e botões cheios levam `style={shadow.card}` (`boxShadow` nativo em tokens.js; o NativeWind não converte sombra dupla de className) para descolar do papel; tinta
  (`ink`) mais escura para definição. Cartões, botões e campos seguem opacos de propósito. Estrutura e navegação não mudaram. Os dois pacotes são nativos: precisa de
  `npx expo run:ios --device` de novo e de build EAS nova para o Android.
  **Layout completo aplicado em 27/09/2026 (mesclado em `claude/laughing-keller-my8t7c` no mesmo dia, com o ok dele,
  junto com tudo da branch padrão; a branch antes do merge é o commit `674f9aa`):** fundo
  aurora (`src/components/Aurora.tsx`, svg atrás de cada tela), cartões translúcidos sem borda
  (`surface` virou rgba; `solid` é o branco opaco), chips e campos tonais (`src/components/Chip.tsx`,
  `SearchField.tsx`), títulos em Oswald caixa alta mas seções/botões/rótulos em Space Grotesk caixa
  normal, cartão escuro no Início e no resumo do bairro, busca + filtros no Início, estatísticas com
  ícone tonal (`StatCard`), azulejo por categoria no `PlacePhoto` (cinza em lugar sem nota, `muted`),
  Mapa em tela cheia com chips flutuantes e folha de vidro (`app/(tabs)/mapa.tsx`), pergunta da marca
  em arco-íris (`RainbowText`), aba ativa com lente branca e cor própria (`tabColors`).
  **Animações (Reanimated) aplicadas na sequência:** `Splash.tsx` (desde 27/09 é a v2 de `docs/abertura.html`, escolha dele:
  o radar pinta o anel, a varredura pinta a tela toda até a borda, olho com borda branca de 5 px e
  IRISA em branco, as cores saem pela mesma varredura e o app aparece, 7,25 s;
  montado em `app/_layout.tsx` por cima de tudo depois das fontes; 0,3 s com "reduzir movimento"),
  `TabIcon.tsx` (ícone da aba sai do cinza, passa pelo arco-íris e pousa na cor da aba, com pulinho),
  `PlacePhoto` com `muted`+`progress` (foto/azulejo cinza que ganha um quarto de cor por pergunta
  respondida na ficha; foto real usa `filter: grayscale` do RN 0.86 a zero respostas e um véu que
  some depois), `IrisScore` enchendo gomo a gomo, `CountUp.tsx` (nota e estatísticas contam),
  `AxisStrip` crescendo, `PlaceCard`/`OccurrenceCard` entrando escalonados (`index`).
  Protótipo navegável que originou isso: `docs/prototipo-ios27.html`; comparação atual × proposta,
  apresentação para o Alysson em `docs/apresentacao-liquid.html`; plano de lançamento em
  `docs/plano-lancamento.html` (nenhum deles é publicado no site).

- **0.1.1 liberada nas duas lojas (dito por ele em 03/10/2026).** Versão do app subiu para 0.1.2 (a da build com push).
- **iOS 0.1.2 (build 10) gerada no EAS e enviada ao App Store Connect em 04/10/2026** (`--auto-submit`), com push,
  gamificação e aba ativa corrigida; chave de push da Apple criada no mesmo build. Falta criar a versão 0.1.2 na
  App Store Connect, escolher a build 10 e enviar para revisão. `npx expo run:ios --device` (Debug) no Mac dele
  falha no link com `Sealable::Sealable()` do MapLibre (núcleo do RN pré-compilado em Release); a build EAS (Release)
  passa. Para testar no iPhone: `npx expo run:ios --device --configuration Release`.
- **Notificações push (migration 38 + Edge Function `send-push`, 03/10/2026):** `expo-notifications` é
  nativo, então só funciona a partir da próxima build (0.1.2). `src/hooks/usePush.ts` só faz o `require`
  depois de `requireOptionalNativeModule("ExpoPushTokenManager")`: o mesmo JS chega por EAS Update em
  0.1.1 sem derrubar o app (lá ele simplesmente não pede permissão). Pede a permissão uma vez, depois do
  login e do splash, grava o token por `register_push_token` em `push_tokens` (sem policy, some com a
  conta) e abre `data.url` ao tocar. Envio pelo SQL Editor com `supabase/notificacoes.sql`:
  `enviar_notificacao(titulo, corpo, quando, url, cidade)` grava em `push_envios`; na hora chama a função
  na mesma transação, agendado o pg_cron `send-push` (5 em 5 min) pega. Senha só no Vault (`push_secret`,
  gerada pela migration), conferida por `push_autorizado`. Token de aparelho que desinstalou
  (`DeviceNotRegistered`) é apagado no envio. **Antes da build:** Android precisa do Firebase (projeto no
  console do Firebase com o pacote `br.com.irisa.app` → `google-services.json` → `npx eas-cli env:create
  --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json` nos ambientes preview e
  production → chave de conta de serviço FCM V1 em `npx eas-cli credentials` → Android → Push
  Notifications). iOS: o `eas build` pergunta se gera a chave de push da Apple (responder sim).
  O arquivo `google-services.json` está no .gitignore (repo público).
- **Gamificação (proposta, 03/10/2026, nada no app ainda):** `docs/gamificacao.html` é a apresentação para o Aly
  (anel de 48 gomos, dias acesos, faíscas, caixinha, desafios, pulseira). Pingentes seguem o briefing dele: título
  primeiro, objeto depois, sem bandeira/arco-íris/emoji; os 30 estão em `docs/pingentes.js` (dados + SVG) e no
  catálogo `docs/pingentes.html`. Títulos com flexão (Famosinha/o/e) a pessoa escolhe no Perfil. Telas de exemplo em
  `docs/gamificacao-telas.html`, exportadas por `node scripts/gamificacao-telas.mjs` para `docs/gamificacao/tela-*.png`.
  **Arquivo para mandar:** `docs/Irisa-gamificacao.html` (27 slides, pingentes.js e telas embutidos, abre sozinho);
  depois de mexer na apresentação ou nas telas, `node scripts/gamificacao-unica.mjs` gera de novo. O `gamificacao.html`
  avulso só abre com `pingentes.js` e `gamificacao/` na mesma pasta.
  Regras: relato nunca pontua, nada público, nada de check-in, "Da Casa" nunca mostra o lugar no cartão do story.
  **V3 (04/10/2026, `docs/gamificacao-v3.html` → `docs/Irisa-gamificacao-v3.html`):** resposta à V2 que o ChatGPT fez.
  Fica a cadeia única, os quatro tempos e o lançamento com 12 pingentes; corrige: nome de lugar nunca no pingente,
  missão nunca por horário/região de alerta, denominador da cidade = os 100 lugares mais conhecidos (`prominence`),
  gomo provisório na hora e confirmado em 48 h, dia guardado na sequência. Os 12: Deu o Nome, Deu Close, Figurinha,
  Famosinha, Inaugurou, Acendeu a Luz, Eu Conheço um Lugar, Nome na Lista, Mala Pronta, Bateu Ponto, Ombro Amigo,
  Abre-Alas (este só vale para quem entrou no teste fechado do Android, então tem que sair antes da produção).
  **Proposta final (04/10/2026, `docs/gamificacao-final.html` → `docs/Irisa-gamificacao-final.html`, artefato publicado):**
  V3 + retorno do Aly. **Sem sequência diária** (ele acha irritante): "semana acesa" = app aberto em 4 dias quaisquer
  da semana, recomeça na segunda sem perder nada; Bateu Ponto = primeira semana acesa, Já Mora Aqui = 4 semanas,
  seguidas ou não. **Medalhas limpas** (ele achou os pingentes poluídos): `PINGENTES.medal()` em `docs/pingentes.js`
  desenha disco + objeto + anel de progresso; bloqueada é silhueta com cadeado e o anel mostra quanto falta; sem
  argola, sem selo de raridade na tela. Telas em `docs/gamificacao-final-telas.html` →
  `node scripts/gamificacao-telas.mjs docs/gamificacao-final-telas.html` → `docs/gamificacao/final-*.png`.
  **Sem moderação prévia nas avaliações (dito por ele em 04/10/2026):** avaliação aparece na hora, então a proposta
  final não tem mais o elo de 48 h; o gomo acende na hora e apaga se uma denúncia derrubar a avaliação, e medalha
  de quantidade pede semanas diferentes (Famosinha: 30 avaliações em 4 semanas) para ninguém farmar num dia.
  **Protótipo navegável (04/10/2026):** `docs/prototipo-gamificacao.html` → `docs/Irisa-prototipo-gamificacao.html`
  (arquivo único, artefato publicado). Tour de 12 passos com holofote + navegação livre: semana acesa, 12 dos 100,
  medalha quase lá, avaliar, recompensa na hora (gomo, faísca voando, Famosinhe 22→23), desbloqueio de Acendeu a Luz
  (5ª avaliação do lugar), cartão do story sem o lugar, pulseira, detalhe, caixinha com banho neon e as travas.
  Nada grava; é encenado com Web Animations.
  **Ajuste do Aly (04/10/2026):** as telas atuais não mudam. A ficha do lugar no protótipo é a do app (as quatro
  perguntas de `AXES` com o marcador `Rainbow` de cinco faixas, comentário, foto, botão amarelo); o Perfil mantém foto,
  apelido, cidade, privacidade, bloqueados, sair e excluir, e ganha só o cartão "Sua pulseira" (a grade abre numa tela
  por cima). O Início mantém o painel escuro e ganha dois cartões abaixo. **Semana sem dia da semana:** quatro gomos que
  só enchem ("3 de 4"), para nada parecer dia perdido. **Dias 5, 6 e 7:** uma faísca cada, sem prêmio de 7 de 7
  (decisão de produto: ninguém pode sentir que precisa abrir todo dia).

- **Gamificação no app + painel (migration 39, 04/10/2026):** só acréscimos. Banco: `user_days` (dia em que abriu,
  só a data; `consulted`/`supported`), `user_medals`, `user_boxes`, `app_settings` (aviso no Início, data do Abre-Alas),
  `push_aberturas`, `profiles.medal_form`. `my_gamification(p_city)` calcula tudo e grava medalha nova; `track_day`,
  `open_box`, `set_medal_form`, `mark_medals_seen`, `app_config`. Regras do anel: 1 gomo por avaliação no ar + 1 se foi
  a primeira do lugar + 1 se foi a 5ª + 1 por lugar cadastrado + 1 por foto aprovada (teto 48; nível = gomos/8).
  Faísca: consulta do dia, apoio no mural do dia, dias 5–7 da semana; caixinha a cada 10 faíscas e a cada semana acesa.
  Abre-Alas: conta criada até `app_settings.abre_alas_ate` (null = todo mundo, enquanto o Android está em teste:
  **gravar a data no painel no dia em que for para produção**). App (só JS, sai por EAS Update): `src/lib/medals.ts`
  (mesmo desenho do `docs/pingentes.js`, via `SvgXml`), `src/hooks/useGamification.ts`, `src/components/gami/*`,
  `app/pulseira.tsx`; Início ganhou `AvisoCard` em cima e `GamiHomeCards` embaixo do painel; Perfil ganhou só
  `PulseiraCard`; ficha do lugar marca consulta e mostra `RewardSheet` em avaliação nova (atualização segue com o
  alerta de sempre); `MedalCelebration` no layout raiz. Sem a migration no banco, tudo isso some calado.
  Push: `send-push` manda o id do envio e o app grava a abertura — **republicar a função** (`npx supabase functions
  deploy send-push --project-ref ntjirpqulrnieeglpiei`) para o painel contar quem abriu.
  **Painel web:** `docs/admin/` → https://appirisa.com.br/admin/ (funções `admin_*`, papel conferido em cada uma;
  moderação vê moderação/lugares/fotos, admin vê tudo). Relatos nunca aparecem ligados a uma pessoa, nem no painel.
  Foto da equipe: Storage `fotos-lugares/equipe/<lugar>/…` + `admin_place_photo` (origem `equipe`).
  Login do painel com e-mail/senha ou Google; para o Google funcionar, `https://appirisa.com.br/admin/` tem que estar
  em Supabase → Authentication → URL Configuration → Redirect URLs. O painel é JS puro (`docs/admin/admin.js`),
  sem build; a chave `sb_publishable_` entra pelo `build-site.mjs` igual à da landing.
  **Apple no painel (05/10/2026):** o botão "Entrar com Apple" dava "Unsupported provider: missing OAuth secret": login
  da Apple pelo navegador precisa de Services ID + Secret Key no provider Apple da Supabase (o login nativo do app não
  precisa). Ficou escondido (`APPLE_WEB = false` em `docs/admin/admin.js`) e entrou **"Sem senha? Receber link por
  e-mail"** (`signInWithOtp`, `shouldCreateUser: false`): conta criada com Apple ou Google entra pelo link, aberto no
  mesmo navegador (PKCE).
  **Aba ativa quadrada nas pontas (corrigido):** a lente virou camada própria com raio medido (`onLayout`).
  **Ajuste depois do 1º dia (migration 40, 04/10/2026, retorno dele):** o anel enchia rápido demais (com quase todo
  lugar sem nota, cada avaliação valia 2 gomos e o Leandro fechou os 48 no primeiro dia). Agora **cada semana acende no
  máximo 4 gomos** (avaliação, 5ª avaliação do lugar, lugar cadastrado, foto aprovada; a "primeira do lugar" não soma
  mais, ela é a medalha Inaugurou): 48 gomos = 12 semanas no mínimo. `my_gamification` devolve `gomos_semana` e
  `gomos_semana_max`. Figurinha/Famosinha mostravam 15/15 trancada (faltava a trava das semanas): com as avaliações
  feitas, o progresso passa a contar semanas; toda medalha de contagem tem `unidade`. **"Pulseira" virou
  "Conquistas"** (rota `/conquistas`, `ConquistasCard`), e o anel saiu dela: no Perfil são dois cartões, `AnelCard`
  (gomos) e `ConquistasCard` (medalhas). Os dois cartões do Início colapsavam (`flex-1` em filho de altura automática):
  agora `flexGrow`. **EAS Update só chega em quem tem a mesma versão do app** (`runtimeVersion` = `appVersion`): com o
  app.config em 0.1.2, update não alcança a 0.1.1.
  **Tour de boas-vindas (04/10/2026, pedido dele):** `src/components/Tour.tsx` + `src/hooks/useTour.ts`. Seis telas
  deslizáveis (boas-vindas, quatro perguntas, relato anônimo, emergência, apoio, conquistas) com Pular/Próximo/Começar,
  uma vez por aparelho (AsyncStorage `irisa.tour.v1`; trocar para v2 faz todo mundo ver de novo), depois do login e do
  splash. O pedido de notificação e a celebração de medalha esperam o tour fechar. Perfil ganhou a linha "Como a Irisa
  funciona → Rever o tour". Só JS: sai por EAS Update (para quem tem 0.1.2).
  **Protótipo v2 para aprovar (04/10/2026, retorno do Leandro):** o tour de seis telas com ícones pulando não agradou.
  `docs/prototipo-gamificacao-v2.html` → `docs/Irisa-prototipo-gamificacao-v2.html` (artefato
  https://claude.ai/artifact/RtAaAJagiNUDsh3tKFGSrS): tour dentro do Início (anel da marca se desenha gomo a gomo,
  holofote + borda arco-íris que se desenha em volta de cada alvo, balão com Pular/Próximo), animações só de
  preenchimento (gomos, borda, barras, contagem; nada de pulo grande), borda de progresso no cartão Sua semana,
  Sua semana e Sua cidade abrem detalhe (só os dias que contaram; perto do selo e já com selo), Quase lá em destaque
  no Início e herói escuro nas Conquistas. **Nada disso está no app ainda: esperando aprovação.**
  **Lugares perto de você (migration 41, 04/10/2026, achado pelo Leandro em Pinhais):** a aba Lugares mostrava os do
  centro de Curitiba. Duas causas: o `CityProvider` só lia o GPS quando não havia cidade salva nem no perfil (quase
  nunca), e a lista era o lote de 1.000 da cidade escolhida ordenado por distância. Agora `locate()` no provider lê a
  posição sempre (sem pedir permissão na abertura; a aba Lugares pede), e com posição a lista vem de `places_near`
  (índice espacial, até 30 km, 200 lugares, qualquer município). Sem posição ou sem a migration, volta ao lote da cidade.
  **Protótipo v2 ampliado (04/10/2026, 15 passos):** entraram Mapa (painel sólido com Mapa/Lista e camadas Lugares/
  Relatos, pinos agrupados com número, lugar sem nota como pontinho, relato como área, folha "Perto de você"), Apoio
  (mural em papel colado com pergunta da semana, atalhos abraço/dica/pedir ajuda, reação por tipo, aba Serviços com os
  4 números grandes), **pronome no Perfil valendo para o app todo** (a frase da marca "onde a gente é bem-vinde" não
  muda) e a **descoberta na Home**. Reação por tipo e pergunta da semana pedem banco novo.
  **Descoberta na Home (proposta, NÃO implementar sem ok dele):** `docs/descoberta-proposta.html` → artefato
  https://claude.ai/artifact/BpjJ4FLBXBCP3GLBLsyuyh. Regra dele: o framework de avaliações não muda (perguntas, escalas,
  pesos, `place_ratings`, cálculo). "Já fui" leva à ficha de sempre; origem só em `discovery_events` (sem coluna nova
  em `place_ratings`, recomendação) e na rota `?origem=home_discovery&avaliar=1`. Pendente decidir a folha de
  recompensa quando a avaliação vem da descoberta.
  **Ajustes do Leandro (04/10/2026):** descoberta não fica fixa na Home: é um cartão único acima da barra, no máximo
  1x/dia, com X, nunca no 1º uso nem em relato/emergência/Apoio. Mapa com mais contraste nos cartões da folha. Mural
  numa coluna só; seis reações da casa com desenho próprio (Te abraço, Arrasou/leque, Tô contigo, Sinto muito,
  Acendeu, Mais cor/anel da Irisa); sem iniciais de quem respondeu a pergunta da semana; "Publicar como Anônimo"
  (ligado sozinho em pedido de ajuda); aviso para não pôr telefone/endereço/nome completo; texto que parece relato
  oferece virar relato anônimo (o mural nunca pode ser atalho para relato com apelido).
  **Bege saiu (pedido dele, 04/10/2026):** o tom areia de fundos tonais (folha do mapa, chips, seletores, trilhos
  vazios) vira azul-claro frio no estilo iOS: `subtle` #F1F5FA, vazio #E6ECF3, alça #D3DBE6, folha do mapa com a
  textura de aurora do fundo do app (o azul ficou feio ali).
  **Medalhas mais difíceis (migration 42, 04/10/2026, decisão dele):** Deu Close = 10 avaliações em 2 semanas;
  Inaugurou = 3 lugares sem nota em 2 semanas; Eu Conheço um Lugar = lugar cadastrado que outra pessoa avaliou;
  Nome na Lista = 6 bairros. Abre-Alas e as outras iguais. Quem já ganhou fica com a medalha. Textos em
  `src/lib/medals.ts` e `docs/pingentes.js` (chegam no app pelo próximo update).
  **Protótipo v2 APLICADO no app (04/10/2026, aprovado por ele; só JS, sai por EAS Update para quem tem 0.1.2):**
  migrations 43 (reações `support_reactions` + `react_support`, a curtida antiga vira "abraco" por trigger;
  `support_messages.prompt` e `app_settings.pergunta_semana`; `discovery_events`, `discovery_slate`, `discovery_log`,
  `admin_discovery`; `my_week`, `city_top_places`) e 44 (painel salva a pergunta). App: Mapa novo
  (`src/components/map/*`; lugares com nota fora dos grupos, de propósito), Apoio novo (`src/components/mural/*`,
  mural nacional, Anônimo = apelido "Anônimo", "Virar relato" abre `/registrar?texto=`), Início/Perfil/Conquistas
  (`src/components/gami/Anim.tsx`, `WeekSheet`, `CitySheet`, `FormaCard`, `MedalDetail`; `useForma`, `flexWord`),
  tour v2 (`Tour.tsx` com alvos `TourTarget`/`useTourTarget`, chave `irisa.tour.v2`), descoberta
  (`DiscoveryNudge.tsx`, `useDiscovery.ts`; folhas abertas avisam com `useFolhaAberta`), ficha com `?origem=home_discovery&avaliar=1`
  e RewardSheet com `frase`. `subtle` = #F1F5FA e `border` = #E6ECF3 em tokens.js. Nada disso rodou em aparelho antes do
  update: lint, typecheck, teste do banco e `expo export` passaram. Ao implementar, trocar `subtle` em `src/theme/tokens.js` (o papel #F5F4F1 fica).
  **Tapa visual (04/10/2026, retorno do Leandro):** o visual v2 foi para o resto do app (formulários de relato e
  lugar, Lugares, Perfil, login, moderação, bairro): seletor de dois lados = `src/components/Segmented.tsx` (pílula
  branca deslizando no trilho claro, saiu de `mural/`), chips tonais, campos em cápsula branca, botão secundário
  branco. Conquistas: o fundo escuro do destaque é medido (`onLayout`), porque o svg em 100% ficava do tamanho da
  primeira medida; o cabeçalho das telas empilhadas não usa mais `headerBlurEffect` (fazia uma faixa).
  **Quando a descoberta aparece:** sessão nova depois da do tour (fechar o app de vez e abrir), ~8 s parado no
  Início ou em Lugares sem folha aberta, uma vez por dia; não aparece na sessão em que abriu o registro de relato.
  A folga de 30 min depois do tour saiu.
  **Sua cidade vira convite (migration 45, 04/10/2026, retorno do Leandro):** "0 de 100" no começo só desanimava.
  Enquanto a cidade não tem selo, o cartão do Início mostra "Falta N para <lugar> ganhar o 1º selo de <cidade>"
  (anel de 5 gomos do lugar) e a folha abre com "1º selo de <cidade>". Com selo, volta o "N de 100" e a frase ainda
  aponta o próximo. Só convida para lugar que a pessoa ainda não avaliou (`my_rated_places(ids)`, só ids;
  `convitesDaCidade` em `useGamification.ts`); a folha ganhou "Ainda sem nenhuma cor" (conta para Inaugurou).
  **"Suas cores" substituiu "Sua cidade" (migration 47, 04/10/2026, pedido do Leandro):** o placar da cidade não é
  conquista do usuário. O cartão mostra os lugares que a pessoa avaliou, a melhor frase de efeito (selo que saiu com a
  avaliação dela > "N pessoas abriram a ficha depois da sua avaliação" > primeira cor > bairros) e o anel de bairros
  rumo aos 6 da Nome na Lista; com zero avaliações, convida para um lugar conhecido. Folha `CoresSheet.tsx` com os
  números, o mapinha dos lugares coloridos e convites. `place_views` guarda só contagem por lugar/dia (nunca quem abriu);
  o app conta cada lugar uma vez por aparelho (`logVistaDeLugar`, AsyncStorage `irisa.vistos.v1`), e quem avaliou não
  conta. `my_cores()` monta o resumo. O "N de 100" da cidade segue no `my_gamification` para o painel.
  **Comemoração calma (mesmo dia):** RewardSheet, MedalCelebration, BoxModal e Sheet sem mola nem confete nem
  loop: aparecem subindo 12 px, a borda arco-íris se desenha uma vez, os gomos enchem, o número conta.
  `Shine` aceita `once` (uma passada fraca); "Quase lá" e Conquistas usam `shine="once"`.
  **Cadastro de lugar confere o endereço (migration 46):** o Na Feira Bar entrou com o alfinete no GPS do Leandro
  (Rebouças) e o endereço certo no texto (Princesa Izabel 465, Mercês). Agora o envio busca o endereço escrito que não
  foi conferido e, se ficar a mais de 150 m do alfinete, pergunta "No endereço / No alfinete / Ajustar". A 46 moveu a ficha.
  **Segunda leva de conquistas (migration 48, 04/10/2026, pedido do Leandro): 32 medalhas no ar.** +15 do catálogo que
  cabem nos dados (Sabe Onde Ir, Pode Entrar, Ícone Local, Lenda Local, Utilidade Pública, Interesse Municipal, Aclamada,
  Influ do Vale, Da Casa, Já Mora Aqui, Olho Vivo, Agenda Cheia, Bateu Leque, Patrimônio Cultural, Patrimônio Tombado) e
  +5 novas desenhadas em `src/lib/medals.ts` (Dona do Pedaço: 5 lugares no mesmo bairro; Resenha Boa: 10 avaliações com
  comentário de 60+ letras; Cartógrafa: 5 lugares cadastrados que outras pessoas avaliaram; Abraço Coletivo: 20 reações
  nas suas mensagens; Tem Opinião: pergunta da semana respondida em 4 semanas). "Ajudou" das medalhas de reconhecimento =
  pessoas que abriram a ficha depois da sua avaliação (`place_views`). Olho Vivo usa `user_days.bairro` (só o dia, via
  `trackDay("bairro")` na ficha do bairro). De fora, sem dado: Favorita do Público, Serviu Tudo, Rede de Apoio.
  `LANCAMENTO` (nome mantido) virou a lista das 32 na ordem da grade. As 5 novas ainda não estão no `docs/pingentes.js`.
  **Sua evolução (APLICADO, 04/10/2026, aprovado pelo Leandro; protótipo `docs/prototipo-evolucao.html`, artefato
  https://claude.ai/artifact/JnQKhqE35vAvRNgeG9eWXp):** "Seu anel · Coral" virou "Sua evolução". A íris de 48 gomos fica; o
  nível é título com ícone em 8 degraus, calculado no app pelos gomos (`src/lib/niveis.ts`: Curiose/Entendide/Irisade com
  flexão, Close Certo, Do Babado, Mapa Vivo, Lenda Local, Patrimônio LGBTQIA+, aos 0/2/5/10/16/24/34/48 gomos).
  `src/components/gami/Evolucao.tsx`: `EvolucaoCard` (Perfil), `TrilhaSheet` e `SubiuDeNivel` (layout raiz; espera
  avaliação e medalhas novas; AsyncStorage `irisa.nivel.visto.v1`, e na primeira vez só guarda, sem festa). O
  `AnelCard` e o `NIVEIS` de cores saíram. A medalha Lenda Local virou **Estátua na Praça** (id `lenda-local` igual).
  **Roteiro de lançamento da 0.1.2: `SUBIR-0.1.2.md` na raiz** (teste pelo TestFlight + EAS Update, build nova dos dois
  lados, textos das lojas).
  **Compartilhar no story (04/10/2026, pedido do Leandro):** `src/components/gami/Compartilhar.tsx`. Prévia em tela cheia
  do cartão 1080 × 1920 (medalha ou nível, frase da marca, sem apelido, sem lugar, sem relato) e "Compartilhar" pelo
  menu do celular (Instagram → Story). Botão no detalhe da medalha, na comemoração de medalha, na subida de nível e na
  trilha. Peças nativas novas (`react-native-view-shot`, `expo-sharing` sem o plugin, que é de receber compartilhamento)
  e `NSPhotoLibraryAddUsageDescription` no app.config (sem ela "Salvar imagem" fecha o app): **precisa de build nova**.
  `podeCompartilhar()` esconde o botão em build antiga, então o JS segue seguro por EAS Update na build 10.
  **Story direto (mesmo dia):** o menu do iPhone escondia o Instagram (ele testou e só aparecia WhatsApp). Agora a
  prévia tem **"Story do Instagram"** (`react-native-share`, `Social.InstagramStories`, `appId` = ID público do app Irisa na
  Meta 2296597601132815; abre o story já com a imagem de fundo) e **"Outros apps"** (expo-sharing). Sem Instagram
  instalado, cai no menu. `plugins/withInstagramStories.js` declara `instagram-stories` no iOS e o pacote do Instagram
  nas `<queries>` do Android (o plugin da biblioteca exigia expo-build-properties). Nativo: só em build nova.
  **Cartão rediagramado + confete (mesmo dia, retorno dele: a frase ficava por cima da logo):** o cartão agora é uma
  coluna (selo "Desbloqueei na Irisa" em cápsula, medalha com halo claro e brilhinhos, nome, barrinha arco-íris, frase,
  logo e frase da marca embaixo), dentro das faixas que o Instagram cobre (92 px em cima, 104 embaixo). A prévia ganhou
  uma explosão de confete uma vez ao abrir (`src/components/gami/Confete.tsx`, Reanimated, fora da imagem capturada,
  nada com "reduzir movimento") — exceção pedida por ele à regra de comemoração calma, só nesta tela.
  **Ícones 3D nas conquistas (04/10/2026, folhas do Leandro):** as 35 medalhas (as 32 do app + Favorita do Público,
  Serviu Tudo e Rede de Apoio, para quando tiverem dado) são objetos 3D. Fontes em `assets/medalhas/folhas/folha-1..7.webp`
  (5 por folha, ordem em `FOLHAS` de `scripts/medalhas-recortar.py`); `python3 scripts/medalhas-recortar.py` tira o fundo
  claro, recorta e grava `assets/medalhas/<id>.png` (384 px) e gera `src/lib/medalImagens.ts`. `MedalView` desenha o
  disco e o anel em SVG (`medalXml(..., {semArte: true})`) e o objeto por cima como imagem: entra subindo de leve e,
  com `flutua` (comemoração, caixinha, detalhe, prévia do story), flutua devagar; bloqueada é a mesma imagem tingida de
  cinza (`tintColor`) com cadeado. Medalha sem imagem cai no desenho SVG de sempre. Só imagem no JS: sai por EAS Update.
  **Cartão do story na identidade do Instagram (mesmo dia):** papel com as quatro manchas, eyebrow turqInk
  ("Conquista na Irisa" / "Nível N de 8"), linha leve "Desbloqueei"/"Agora sou", nome em Oswald com arco-íris (SVG),
  objeto 3D num cartão de vidro com brilhinhos que piscam, frase, e assinatura `#radarmin` + IRISa centralizada a 40
  (120 em 1080) do fundo. Na prévia o objeto entra crescendo e flutua; o confete segue fora da captura.
  **Níveis de Sua evolução em 3D (mesmo dia):** lupa (Curiose), binóculo (Entendide), prisma (Irisade), batom (Close
  Certo), globo de espelho (Do Babado), globo terrestre (Mapa Vivo), tocha (Lenda Local), troféu (Patrimônio LGBTQIA+),
  escolhidos para não repetir objeto das conquistas. Folhas em `assets/medalhas/folhas/niveis-1` e `niveis-2`, recorte
  pelo mesmo script em `assets/niveis/nivel-0..7.png` (`NIVEL_IMG`); essas folhas têm sombra creme, então usam o fundo
  tolerante (`QUENTES`), menos o prisma (vidro quase branco). Fica um resto de sombra clara que some em fundo claro, que
  é onde o ícone aparece (selinho branco, trilha, cartão de story). O desenho SVG de `niveis.ts` segue como reserva.
  **Texto do story para quem lê (mesmo dia, retorno dele):** o cartão não usa mais o `copy` da medalha (que fala com
  quem ganhou, "você"): cada medalha tem `story` e cada nível tem `s`, em primeira pessoa ("Já avaliei 10 lugares na
  Irisa. O mapa agradece."), sem aspas. Quebra de linha feita no app (`quebrar()` em `Compartilhar.tsx`): menor número
  de linhas que cabe, corta de preferência em fim de frase, nunca deixa "de/a/na" no fim da linha; nome com até 13
  letras por linha, frase com até 32. Rodapé ganhou "O mapa dos lugares onde a gente é bem-vinde" acima da assinatura.
  Frase nova de medalha: escrever o `story` pensando em quem vê o story e conferir a quebra (cabe em 2 ou 3 linhas).
  **Protótipo navegável do app inteiro (04/10/2026, pedido do Leandro):** `docs/prototipo-app.html` (molde) →
  `python3 scripts/prototipo-app.py` → `docs/Irisa-prototipo-app.html` (arquivo único, ~600 KB, ícones 3D e dados das
  conquistas/níveis embutidos a partir de `medals.ts`/`niveis.ts`). Abertura, entrar, tour, Início, Lugares, ficha
  com nota e avaliação (as quatro perguntas → recompensa → conquista nova → story), Mapa, bairro, relato, emergência,
  Apoio (mural e serviços), Perfil, Sua evolução, Conquistas, subiu de nível, Sua semana, Suas cores e "Passou por
  aqui?". Painel ao lado com atalhos e o pronome (a/o/e); no celular, botão "Telas". Lugares e pessoas são fictícios.
  Mudou texto de medalha/nível ou ícone: rodar o script de novo.
  **Conquistas sem visualização, ajustes no painel e público do push (migration 64, 06/10/2026, pedido do Leandro):**
  Utilidade Pública, Interesse Municipal, Aclamada e Influ do Vale contavam "pessoas que abriram a ficha depois da sua
  avaliação" — sem volume, e a conta incluía a própria pessoa (a visita gravada antes de avaliar). Agora: Utilidade
  Pública = 5 dicas de segurança no mural; Interesse Municipal = 20 avaliações na mesma cidade; Influ do Vale = 60
  avaliações em 6 semanas; Aclamada = 100 avaliações em 10 semanas. Quem já tinha fica. O "ajudou" de Suas cores conta
  só a partir do dia seguinte à avaliação. O cálculo antigo virou `gami_stats_calc`; `gami_stats` aplica as regras novas,
  o ajuste de gomos (`gami_ajustes`) e as revogadas (`user_medals_revogadas`, não voltam sozinhas). Painel → Pessoa:
  **Liberar/Revogar** em cada medalha e **Mudar nível** (leva ao começo do nível; "Automático" tira o ajuste),
  RPCs `admin_medal_grant`, `admin_medal_revoke`, `admin_set_level`. **Notificação para pessoas escolhidas:** Para quem =
  Todo mundo / Uma cidade / Pessoas escolhidas (busca por apelido ou e-mail), e na ficha da pessoa "Mandar notificação só
  para essa pessoa". `push_envios.usuarios uuid[]`; a Edge Function `send-push` usa `push_pegar_envios_v2` e
  `push_tokens_do_envio_v2(p_envio)`. A função velha (`push_pegar_envios`) nunca pega envio com pessoas escolhidas, para
  ele não sair para todo mundo se a função nova ainda não estiver publicada. O push semanal mandava o nível para
  `/evolucao` (não existe): agora `/perfil`. **Texto cortando no iOS:** o efeito de revelar do tour cortava o acento
  (máscara com `overflow: hidden`, ganhou folga de 8 px) e os títulos em Oswald caixa alta tinham entrelinha ≤ 1,1 do
  corpo (no iOS o À/É sobe acima da linha): todos subiram para ~1,17. Título novo em Oswald: entrelinha de pelo menos
  1,15 × o tamanho.

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
**Não funciona hoje (30/09/2026):** o repositório não tem esses secrets (o run sai com a chave vazia) e a
API de malhas do IBGE não responde aos servidores do GitHub (timeout). Importar pelo Mac.

Checks antes de commitar: `npm run lint && npm run typecheck`. Migrations testáveis localmente com `scripts/db-smoke.sh`.

**Migrations sobem sozinhas (01/10/2026, pedido dele):** push em `supabase/**` nas duas branches principais
roda o smoke (`db.yml`) e, se passar, o job `aplicar` chama `scripts/aplicar-migrations.sh`, que aplica no
banco só os arquivos que ainda não estão em `irisa_ops.migrations` (cada um numa transação, junto com o
registro). Secret `SUPABASE_DB_URL` no GitHub; se vier a conexão direta (IPv6, o GitHub não alcança) o
script troca sozinho pelo pooler (us-east-1). Não colar no SQL Editor migration que está no repositório
(rodaria de novo no push). Migration nova é sempre arquivo novo — editar um já registrado não reaplica.
O smoke usa stubs de pg_net (`supabase/dev/pg_net/`), storage, vault e pgcrypto em `supabase/dev/supabase-stubs.sql`.

## Próximos passos (em ordem)

1. Teste fechado no Google Play: 12 testadores já na lista e a contagem dos 14 dias em andamento (dito por ele
   em 30/09/2026). No fim, "Solicitar acesso à produção". Não deixar cair abaixo de 12 (reinicia a contagem).
2. Bairros de Brasília, São Luís e Palmas — tem que existir fonte, o OSM é que não cobre. Pistas
   ainda não testadas: (a) malha de setores censitários do Censo 2022 no geoftp do IBGE, que traz
   nome de bairro por setor e dá para dissolver por nome; (b) GeoPortal da Seduh/DF para as regiões
   administrativas; (c) dados abertos das prefeituras de São Luís e Palmas (em Palmas a cidade é
   organizada em quadras, não bairros — o nome do "bairro" ali pode ser a quadra).
0. **`SOLTAR-OUTUBRO.md` na raiz é o roteiro da próxima build** (28/09/2026, decisão dele de não
   gastar build à toa): parte 1 sem build (migrations 23 e 24, contas Mapillary/Cloudflare, script
   de fotos, Cloud Vision) pode ser feita já; parte 2 é a build única a partir de 01/10 com bloqueio
   de usuário + IARC, foto do Mapillary, envio de foto, fila de moderação e **EAS Update ligado**
   (`updates.url` + `runtimeVersion: appVersion` no app.config.ts, `channel` por perfil no eas.json,
   `expo-updates` nas dependências). Depois dessa build, mudança de JS/tela sai por
   `npx eas-cli update --branch production` e não custa build.
3. Bloqueio por usuário e revogação Apple **implementados em 28/09/2026** (branch
   mesclada na `laughing-keller`): migrations 20 e 21 aplicadas, Edge Functions publicadas, secrets
   da Apple gravados e build iOS no TestFlight em 28/09. **Testado por ele no iPhone em 28/09:** excluir
   conta Apple tira a Irisa de Ajustes → Iniciar sessão com a Apple (revogação real), e bloquear/
   desbloquear esconde e devolve a mensagem. Versão iOS enviada para revisão (dito por ele em
   30/09/2026). Falta, no Android, a build 10 com a resposta do IARC (bloquear outros usuários) mudando para
   **Sim** na mesma versão (cota do EAS vira em 01/10).
4. Apple Developer (US$99/ano) quando decidir publicar no iOS; ou via ONG parceira (Apple isenta ONGs).
   Denúncia, moderação e excluir conta já existem.
5. Fase 6+: notificações por área, rotas seguras, versão web.

## Aprovação de posts do Instagram

Artefato onde o Alysson aprova/reprova cada item de `docs/legendas/fila.json` antes de publicar:
https://claude.ai/artifact/KZFTMrCF28RLVRJr7JXBC5
Coleção `aprovacoes` (doc_id = id do item, `{aprovado, ts}`) e `pedidos` (pedidos de alteração,
filtrar `resolvido == false`). Regra de sincronização: item tipo POST/REELS com `primeiro_comentario`
já preenchido pode virar `aprovado: true` direto a partir do artefato; item tipo STORY nunca
(a API do Graph não posta adesivo de link/enquete/quiz/pergunta em story) — toda story é publicação
manual, e antes de marcar qualquer coisa é preciso perguntar pro Alysson se a story leva adesivo e qual o texto.

**Quem consegue ler as aprovações:** o artefato é público e pertence à conta pessoal do Alysson.
Sessão aberta por essa conta lê a coleção com a ferramenta de banco do artefato e sincroniza a fila.
**Sessão aberta pela conta da Conquer (leandro.borges@escolaconquer) não lê**: a página abre, mas o
banco responde "public artifact from outside the user's organization" e não há o que tentar. Dessa
conta, o caminho é o Alysson dizer no chat o que liberou. Verificado em 01/10/2026.

**Regra dele (01/10/2026): quem sincroniza o artefato com `fila.json` é só a sessão da conta dele.**
Duas sessões mexendo no mesmo arquivo dão conflito — aconteceu neste dia, com uma marcando aprovações
vindas do artefato e a outra remarcando datas. Qualquer outra sessão pode escrever peça nova, legenda,
data e ordem na fila, mas **não mexe no campo `aprovado`**: quem decide isso é o artefato, e quem
transcreve é a sessão dele. Exceção única: o Alysson aprovar explicitamente no chat de outra sessão —
aí ela marca e avisa, para a sessão dele não desfazer.

### Como republicar o artefato (para a sessão da conta dele)

A página era remontada à mão e por isso vivia atrasada: em 01/10 ela ainda mostrava o carrossel-6 com
a lâmina "Ainda não tem no iPhone → **Verdade**" (virou **Mito** no mesmo dia), o fecho antigo
"em fase de testes · Android" em meia dúzia de peças, e não tinha o carrossel-10 nem o 11. Aprovar
olhando aquilo é aprovar o que não vai ao ar. Agora a página nasce do repositório:

```bash
node scripts/artefato-aprovacao.mjs          # no Mac
FFMPEG=/caminho/do/ffmpeg node scripts/artefato-aprovacao.mjs   # no cloud, onde ffmpeg não está no PATH
```

Ele lê `docs/legendas/fila.json`, encontra a arte de cada peça (pela pasta de mesmo nome ou pelo que
`midias` aponta — os stories de outubro, por exemplo, saem de `stories-2/`), e monta **`build/aprovacao/`**:
`index.html`, `t/` (capa de cada peça), `c/` (todas as lâminas) e `v/` (os reels). `build/` está no
.gitignore de propósito: é cópia do que já existe em `docs/`, não entra no repositório nem no site.

**Layout é fixo (regra dele, 01/10/2026): mockup de perfil do Instagram, abas Perfil / Lista, dia a dia /
Calendário, em `scripts/aprovacao-template.html`.** O script só injeta o conteúdo vivo (`FEED`/`STORIES`,
calculados de `fila.json` dentro de `scripts/artefato-aprovacao.mjs`) nesse template — **nunca muda o
visual sozinho**. Trocou de visual uma vez (01/10) sem ele pedir e ele reclamou; o antigo foi restaurado.
Qualquer sessão que rodar o script de novo só deve alterar `aprovacao-template.html` (CSS/HTML/JS do
layout) se o Alysson pedir explicitamente uma mudança de visual — para peça nova, legenda corrigida ou
qualquer outro conteúdo, só `fila.json` muda, o script e o template ficam intocados.

Publicar, da sessão da conta dele, **no artefato que já existe** (o `url` da seção acima, para não
perder as decisões gravadas):

- `file_path` = `build/aprovacao/index.html`; só manda `root`/`files` (`t/`, `c/`, `v/`) quando a arte
  mudou — se só o texto/aprovação mudou, os nomes dos arquivos de mídia continuam os mesmos e um
  publish só do `index.html` basta.
- `capabilities: {db: {rules: [{path: "aprovacoes", read: "view", write: "interact"}, {path: "pedidos", read: "view", write: "interact"}, {path: "publicados", read: "view", write: "interact"}]}, user: {}}`
  — se o artefato já tiver outras capabilities guardadas (ex. `assets`, `downloads` de uma versão
  antiga) e você mandar só `db`/`user`, o publish é recusado por "revogação silenciosa": manda primeiro
  a união de todas, depois republica só com `db`/`user`.
- Com arte nova, são ~35 MB, a maior parte vídeo: mandar em lotes (um publish leva no máximo 64 MB e
  255 arquivos).

A página escreve nas **mesmas coleções de sempre** — `aprovacoes` (doc_id = id da peça) e `pedidos` —
então republicar não apaga nada do que já foi decidido.
**Três decisões no mesmo documento `aprovacoes/<id>` (03/10/2026, pedido dele):**
`{aprovado, publicar_agora, arquivado, ts}`. Quem gravar de fora **tem que mesclar** — um `set` cru
apaga as outras duas (a página mescla pelo cache `docAprov`).
- `publicar_agora: true` — ele quer furar a fila. Na sincronização, além de `aprovado: true`, puxar o
  `quando` da peça no `fila.json` pra agora (STORY continua manual: a Graph API não posta adesivo).
- `arquivado: true` — a data passou e a peça não foi usada. Sai da grade, dos stories, da lista e do
  calendário **sem apagar nada**; o botão "Ver arquivadas" no cabeçalho revela as guardadas e
  "Reaproveitar" devolve pra fila. No `fila.json` é o campo `arquivado` na peça, e peça arquivada
  nunca é publicada pelo robô.
- Peça já publicada não mostra "Publicar agora" nem "Arquivar"; peça arquivada não mostra nenhum outro
  botão além de "Reaproveitar".
Pedido de alteração **não avisa ninguém**: fica em `pedidos` e só é lido quando uma sessão abre a fila —
a própria página diz isso, pra ele chamar no chat quando for urgente.
**Coleção `publicados` (03/10/2026):** botão "Marcar como já publicado" em cada peça (Perfil, Lista
e Story), pra quando ele publica manualmente e quer registrar sem esperar o `fila.json` trazer
`publicado: true`. `jaPublicado(item)` no template é `item.publicado || publicadoState[id]`; some sozinho
quando o repositório passa a trazer `publicado: true`. A aba "Lista, dia a dia" só mostra hoje em diante
(dias passados saem da lista; o Calendário continua com o histórico completo, tem navegação por mês).

## Armadilhas já resolvidas (não repetir)

- **Token da Meta vazou em 28/09/2026** (`META_IG_USER_ID` estava com o token; o erro da Graph API
  devolveu o token e o robô gravou em `docs/legendas/fila.json`, público). Desde 29/09 a Meta responde
  "API access blocked". Desde 30/09 o script passa todo erro por `semSegredo()`. O token segue no
  histórico do git: tem que ser revogado e trocado, não basta apagar do arquivo. `post-bemvinde`
  ficou com `aprovado: false` até o token novo entrar. **Token novo (usuário, longo, app Irisa
  2296597601132815) gravado e testado em 30/09/2026; vence por volta de 29/11/2026.** Para testar sem
  publicar: Actions → Publicar Instagram → Run workflow com "Só testar o token" marcado.
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
- **Cota de build Android do plano Free do EAS estourou em 27/09/2026** (16 builds só em setembro,
  vários em sequência no mesmo dia ajustando coisa pequena — reseta mensalmente, virou em 01/10).
  Regra pra não repetir: só rodar `eas-cli build` quando mudar código nativo (lib nativa, ícone,
  permissão, `app.config.ts`); mudança de JS/tela/lógica é só `npx expo start --dev-client` + tecla
  `r`, sem build nenhum. Testar em `--profile preview` (APK) antes de gastar cota em `production`.
  `npx eas-cli build:list --platform android --limit 15` mostra o histórico e as datas se precisar
  conferir de novo quantos builds já foram usados no mês.
- **Regra do Alysson (01/10/2026): NUNCA gastar dinheiro com a Google Places API, em hipótese nenhuma.**
  Aconteceu em 30/09/2026: a cota diária de `SearchTextRequest` foi subida de 150 para 5.000 pra
  aproveitar a cota do mês antes do reset, e o script rodou tanto num dia só (2.545 lugares casaram
  com foto) que estourou o grátis mensal do SKU "Places API Place Details Photos" (1.000/mês) e gerou
  cobrança real (uns R$2,51+ nesse dia — a cota diária do Console é só um limite de taxa, não um teto
  de gasto; quem trava o gasto é o grátis mensal do SKU, e passar dele cobra na hora, sem aviso).
  Daqui pra frente: cota diária de `SearchTextRequest`/`GetPhotoMediaRequest` sempre no padrão (150/300)
  — nunca subir para "aproveitar" antes do reset. Antes de rodar `google-place-photos.mjs`, conferir
  quantos lugares já casaram com foto **neste mês civil** (não só hoje) e parar com folga antes de 1.000:
  ```sql
  select count(*) from places
  where google_photo_at >= date_trunc('month', now());
  ```
  Perto de 1.000, parar e esperar o mês virar — rodar no ritmo padrão (150/dia) nunca estourou o grátis
  sozinho em menos de uma semana, então não tem pressa. Se mesmo assim bater o teto grátis, o gasto é
  mínimo (centavos por lugar), mas a regra é zero, não "pouco".
- **Limite de 24h para cadastrar lugar removido (migration 29, 01/10/2026):** `enforce_rate_limit`
  recusava lugar novo de conta com menos de 24h (erro "Contas novas podem adicionar lugares após 24
  horas."). App lançou em 01/10/2026 e isso travava gente se cadastrando e já tentando cadastrar o
  primeiro lugar no mesmo dia — tirado por decisão dele. Continua a antiduplicata de 150 m (migration 10).
- **Tela presa depois de cadastrar lugar (01/10/2026, corrigido):** `registrar.tsx` mandava
  `router.replace` para `/lugar/[id]`. A ficha do lugar mora no stack de cima, acima de `(tabs)`:
  o replace trocava a rota `(tabs)` por ela, o stack ficava com uma entrada só e não havia botão
  de voltar nem barra de abas — só fechar o app saía. **Para rota fora das abas use `push`**;
  `replace` só entre abas (o `router.replace("/mapa")` do relato está certo). O formulário se
  limpa antes de sair, porque a aba fica montada no fundo. Só JS: `npx expo start --dev-client` + `r`.
- **Endereço escrito não virava o ponto do lugar (01/10/2026, corrigido):** no cadastro, o campo
  de endereço era só texto — a cidade e o bairro do lugar saem da COORDENADA (trigger no banco).
  Quem escrevia "Rua X, 100" de outra cidade e marcava o ponto com "estou no lugar agora"
  cadastrava o lugar onde estava. Agora o campo tem **"Achar esse endereço no mapa"**
  (`src/lib/geocode.ts`, Nominatim do OpenStreetMap: grátis e sem chave, pela regra de não gastar
  com a API do Google), que move o alfinete, mostra o endereço achado e avisa quando ele cai em
  outro município. A política do Nominatim pede User-Agent identificável e no máximo 1 busca por
  segundo: **a busca é sempre por botão, nunca a cada tecla digitada.** `CityMap` ganhou a prop
  `focus` para a câmera ir até o ponto que veio de fora (GPS ou endereço achado) — toque no mapa
  não recentraliza, de propósito. O texto da seção Local diz que o alfinete é o que vale.
- **Ficha duplicada de bar que mudou de endereço (migrations 31 e 32, 01/10/2026, aplicadas pelo CI):**
  o "Na Feira Bar" de Curitiba estava em duas fichas — a do Overture (endereço antigo, Rua Padre
  Anchieta, zero avaliações) e a que o Leandro cadastrou na porta do bar (Alameda Princesa Izabel,
  1 avaliação), 3,1 km adiante. A trava de 150 m não vê isso. Ficha duplicada racha a nota entre as
  duas e nenhuma chega às 5 avaliações do selo. A 31 faz `places_similar` somar os parecidos da
  **cidade inteira** aos de 300 m (perto: semelhança > 0,3; longe: > 0,55, senão "Bar do João"
  casaria com meia Curitiba) e a tela mostra a distância em km quando passa de 1.000 m. A 32
  escondeu a ficha do Overture (`status = 'hidden'`, não apaga nada; desfaz com `'active'`).
  **A barreira dura do banco segue em 150 m de propósito:** rede com duas lojas na mesma cidade é
  legítima, e recusar cadastro pelo nome a quilômetros travaria lugar de verdade. Longe é conselho,
  perto é regra.
- **Limite de lugares/dia: 5 → 20 (migration 30, 01/10/2026).** Conta dele e do Leandro (tabela
  `rate_limit_exempt`, mesma usada para avaliação) ficam sem limite também em `places`, não só em
  `place_ratings`.
