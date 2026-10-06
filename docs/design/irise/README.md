# Handoff: Irise, assistente de IA do Irisa

## Overview
Este documento descreve o fluxo de cadastro e o assistente "irise" do app Irisa, um mapa colaborativo de lugares acolhedores para pessoas LGBTQIA+.

1. **Pronomes:** a pessoa informa nome, pronomes e como o app deve escrever pra ela (a/o/e).
2. **Escolha do irise:** seleção de personagem no estilo videogame, entre 7 personagens.
3. **Apresentação:** o irise escolhido se apresenta numa caixa de diálogo de RPG.
4. **No app:** o irise acompanha a pessoa em todas as abas. Aparece como avatar, faz falas contextuais, dá missão diária e recompensa com XP e nível, e abre um chat de IA.

## About the Design Files
`Irisa Assistente.dc.html` é uma **referência de design feita em HTML**, não código de produção. A tarefa é **recriar essas telas no código existente do Irisa**, usando os componentes, o roteamento, o estado e os padrões que o projeto já tem.

- Não copie o HTML, os estilos inline nem o runtime do protótipo.
- Abra o arquivo no navegador para ver o comportamento.
- O painel à direita do protótipo ("Ir para") pula direto para cada tela.

## Fidelity
**High-fidelity.** Cores, tipografia, raios, espaçamentos e textos são finais. Onde o app já tiver componentes equivalentes (barra de abas, botões, campos), use os do app e ajuste aos valores daqui.

## Como levar para o Claude Code sem estourar contexto
O HTML é grande. Não peça para o Claude Code ler o arquivo inteiro de uma vez:

1. Copie esta pasta para dentro do repositório, por exemplo em `docs/design/irise/`.
2. Peça para o Claude Code ler **só este README** primeiro e mapear onde cada parte entra no app (onboarding, abas, perfil).
3. Implemente **uma tela por vez**, na ordem das seções abaixo. Peça para consultar o HTML só quando precisar de um detalhe, buscando pelo `data-screen-label` da tela (ex.: `grep -n "02 Escolha" "Irisa Assistente.dc.html"`).
4. Os dados dos personagens e as falas estão em `data/irises.json` e `data/falas.json`. Use esses arquivos, sem extrair do HTML.
5. As imagens em `assets/` já vêm recortadas e com fundo transparente. Copie para a pasta de assets do app.

Prompt sugerido para começar:
> Leia docs/design/irise/README.md. Sem escrever código ainda, me diga em quais arquivos do projeto cada tela e cada componente (IriseAvatar, IriseDialog, IriseOrb, IriseChat) deve entrar, e qual o estado global necessário. Depois implementamos a Fase 1.

## Design Tokens
**Cores**
- Ink (texto, botão primário): `#141829`
- Texto secundário: `#3D4560`; texto terciário/legendas: `#7C8296`
- Fundo: `#F5F4F1`; superfície neutra: `#F1F5FA`; trilha/segmento vazio: `#E6ECF3`; borda/desabilitado: `#D3DBE6`
- Arco-íris da íris (nesta ordem): `#FF6964` `#FFA353` `#FFD066` `#49DCC0` `#59A7FF` `#A889FF`
- Acento ação (CTA de jogo, enviar): `#49DCC0`, com texto `#141829`
- Texto de acento sobre claro: teal `#0A8B7A`, violeta `#6037F0`, dourado `#9C6C00`
- SOS/perigo: `#FF6964` (texto `#141829`)

**Fundo "aurora"** (todas as telas claras):
`radial-gradient(70% 34% at -10% -2%, rgba(73,220,192,.34), transparent 64%), radial-gradient(60% 30% at 110% 4%, rgba(255,105,100,.26), transparent 64%), radial-gradient(70% 34% at 108% 100%, rgba(168,137,255,.32), transparent 64%), radial-gradient(60% 30% at -8% 98%, rgba(255,208,102,.3), transparent 64%), #F5F4F1`

**Vidro (estilo iOS)**, usado em cartões, barra de abas e caixa de diálogo:
`background: rgba(255,255,255,.72); backdrop-filter: blur(28px) saturate(1.8); border: 1px solid rgba(255,255,255,.85); box-shadow: inset 0 1px 0 #fff, 0 14px 34px rgba(20,24,41,.10)`

**Tipografia**
- Display: **Oswald** 700/400, MAIÚSCULAS. Títulos misturam 400 (parte leve) com 700 (parte forte). Tamanhos: 38px (títulos de tela), 34px (nome do personagem), 28px (perfil), 19–24px (botões de jogo, nomes).
- UI/texto: **Space Grotesk** 400–700. Corpo 14–15.5px / 1.42–1.5. Rótulos 11px 700, `letter-spacing:.14em`, maiúsculas.
- Logotipo: **Urbanist** 500, `letter-spacing:.2em`, "IRIS" + "a" em `#E0A32E`.

**Raios:** pílulas = metade da altura (botões 54px → 27px; chips 40 → 20); cartões 26–30px; caixa de diálogo 28px; folha de seleção 38px; tiles de ícone 13–18px.

**Movimento:** easing padrão `cubic-bezier(.2,.7,.2,1)`. Entrada de conteúdo: fade + translateY(14px), 500ms, com escalonamento de 40–60ms. Pop de diálogo: translateY(24px) scale(.96) → 0, 400ms. Flutuar (avatar): translateY 0 → -6px, 3.6s, em loop.

## Componentes do irise (reutilizáveis)

### IriseAvatar (busto saindo do círculo)
- Container com largura S e altura S × 1.24.
- Círculo de tamanho S, alinhado embaixo. Tem anel de 3px com o gradiente cônico do arco-íris e preenchimento interno `radial-gradient(circle at 50% 30%, #fff, #ECE5FF 80%)`.
- A imagem do busto (`assets/b{pose}-{n}.webp`) cobre a área toda acima do círculo:
  - `background-size: 112% auto; background-position: 50% 0`.
  - Cantos de baixo arredondados com o raio do círculo: `border-radius: 0 0 r r`, onde r = (S − 6)/2.
- Efeito: o corpo é cortado pela curva do círculo embaixo, e a cabeça e as mãos saem por cima.
- Tamanhos usados: 66 (botão flutuante), 88 (diálogo), 108 (Apoio), 112 (Início), 124/130 (cartões), 150 (chat).

### IriseDialog (caixa de fala de RPG)
- Cartão de vidro com raio 28 e padding `20px 18px 16px 112px`.
- IriseAvatar de 88 à esquerda, a 12px da borda e 14px de baixo.
- Etiqueta com nome e nível: pílula `#FFD066` de 22px de altura, Oswald 12px, maiúsculas (ex.: "KAI · NV 1").
- Texto em Space Grotesk 15px/500 com efeito **máquina de escrever** a cerca de 60 caracteres/s. Calcule pelo tempo decorrido, não por contagem de ticks, para não travar com timers lentos.
- Toques:
  - Durante a digitação, um toque completa o texto.
  - Com o texto completo, um toque avança para a próxima fala ou fecha.
  - Os botões de ação aparecem só depois que o texto termina.
- "▼" piscando em `#E0A32E` no canto.
- Posição no app: 12px das laterais, logo acima da barra de abas (bottom 102px).

### IriseOrb (botão flutuante)
- IriseAvatar de 66 com flutuação e um ponto de notificação `#FF6964` de 16px.
- Posição: right 16, bottom 102.
- Abre o chat.
- Fica oculto quando há diálogo aberto, com o chat aberto ou no Início (onde o avatar já aparece no topo).

### IriseChat (tela cheia)
- Fundo aurora com brilho violeta no topo.
- Cabeçalho de 270px:
  - Botão fechar de vidro, 40px, à esquerda.
  - IriseAvatar de 150 no centro.
  - À direita: nome em Oswald 24, "NV x" em `#9C6C00` e a classe.
  - Barra de XP com 12 segmentos.
- Mensagens:
  - Do irise: fundo `#fff`, raio `20 20 20 6`.
  - Da pessoa: fundo `#141829` com texto branco, raio `20 20 6 20`.
  - Largura máxima 82%. "Digitando" com 3 pontos.
- Respostas rápidas (pílulas de vidro, 36px): "Onde tem um café acolhedor?", "Como funciona a nota?", "Tô me sentindo insegur{a/o/e}", "Me conta uma curiosidade".
- Campo de vidro de 50px e botão enviar de 50px em `#49DCC0`.
- A **pose do avatar muda conforme o tom**: pensando enquanto responde (pose 5), preocupado em assunto sensível (14), rindo em assunto leve (15), padrão (13).

## Screens / Views

### 01 Pronomes (`data-screen-label="01 Pronomes"`)
- Coluna com padding `64px 22px 34px` sobre o fundo aurora (só os dois gradientes teal e violeta).
- **Topo:** logotipo à esquerda e "1 de 2" (12px/600 `#7C8296`) à direita.
- **Título** (48px abaixo): "COMO A GENTE / TE CHAMA?", Oswald 38/1.02, primeira linha em 400 e segunda em 700.
- **Nome:** rótulo "Nome ou apelido" (12px/600 `#7C8296`). Input sem caixa, 24px/600, com sublinhado de 2px `#141829`. Placeholder "Ex.: Lê", máximo 20 caracteres.
- **Pronomes:** chips de 40px com as opções `ela/dela`, `ele/dele`, `elu/delu`, `qualquer pronome`, `outro`.
  - Não selecionado: transparente com contorno interno de 1.5px `#D3DBE6`.
  - Selecionado: `#141829` com texto branco.
  - "outro" abre um campo livre "Escreva seus pronomes".
- **Como o app escreve pra você:** controle segmentado (trilha `#E6ECF3`, indicador branco deslizante) com `Bem-vinda | Bem-vindo | Bem-vinde`. Escolher o pronome pré-seleciona: ela→a, ele→o, os demais→e.
- **Rodapé:**
  - Prévia ao vivo em Oswald 20, centralizada: "{Bem-vinda/o/e}, {nome}!".
  - Botão "Continuar ›" de 54px, largura total. Fica desabilitado (`#D3DBE6`/`#7C8296`) até ter nome e pronome.

### 02 Escolha do irise (`02 Escolha do irise`)
- Fundo aurora com brilho violeta central.
- **Cabeçalho:** "Fase 2 de 2 · Seu parceiro de jogo" (rótulo teal), título "ESCOLHA SEU IRISE" (Oswald 32) e contador "3/7" à direita.
- **Palco** (368px):
  - Feixe de luz trapezoidal branco translúcido.
  - Pedestal elíptico de 214×46 com anel arco-íris e brilho borrado pulsando (3s).
- **Carrossel:** personagem central de corpo inteiro com 340px de altura. Vizinhos a ±150px, em escala .58, opacidade .5 e `grayscale(.7)`. Os demais ficam ocultos. Transição de 500ms.
- **Navegação:** setas de vidro de 46px nas laterais, deslizar com o dedo (limite de 40px) e miniaturas.
- **Miniaturas:** 7 avatares circulares de 42px. O selecionado ganha anel arco-íris e escala 1.12.
- **Folha inferior de vidro** (raio 38):
  - Nome em Oswald 34, chip de pronome e classe em dourado.
  - Bio em 13.5px.
  - Grade 2×2 de atributos, cada um com 5 segmentos de 8px nas cores: Acolhimento `#FF6964`, Humor `#FFD066`, Papo reto `#49DCC0`, Rolê `#A889FF`.
  - CTA "ESCOLHER {NOME}" (`#49DCC0`, Oswald 19).
- Se a tela veio de "Trocar irise" no Perfil, voltar para o Perfil depois de escolher.

### 03 Apresentação (`03 Apresentação`)
- Fundo aurora com brilho teal.
- Rótulo "Irise desbloqueade" no topo e anel arco-íris girando bem devagar (40s) atrás.
- Personagem de corpo inteiro (400px) com animação de pop. Pose por fala: 2 (aceno), 13, 6.
- Diálogo de vidro na parte de baixo, com 3 falas (ver `data/falas.json`), indicador de etapas em pontos e "Toque para continuar ▼". Na última fala aparece o botão "BORA!", que entra no app.

### 04 Início (`04 Início`)
- Linha do topo: "📍 Curitiba" em texto secundário e pílula SOS.
- "OI, {NOME}" em Oswald 38 com um balão de vidro (raio `18 18 6 18`) com a fala do irise. IriseAvatar de 112 à direita, que abre o chat.
- **Cartão Missão do dia:**
  - Rótulo teal e "NV 1 · 7/12" alinhado à direita.
  - Texto "Avalie 1 lugar · +3 gomos".
  - Barra de 6px com gradiente arco-íris.
  - Botão redondo `#49DCC0` de 44px com "›", que vai para Lugares.
- "Acolhedores perto": lista num cartão de vidro com tile de ícone de 40px, nome, bairro · distância e nota em Oswald 19.

### 05 Lugares, 06 Mapa, 07 Apoio, 08 Perfil
São as telas existentes do Irisa. Só entra o irise: siga o layout atual do app. Mudanças por tela:
- **Lugares/Mapa:** tocar num lugar ou pin faz o irise comentar a nota (ver `falas.json → lugares`) com as ações "Avaliar agora" e "Depois".
- **Apoio:** cartão "Conversar com {irise}" com IriseAvatar de 108, que abre o chat.
- **Perfil:**
  - Cartão do irise: avatar de 130, nome, classe, pronomes, nível e atributos.
  - Botões "Trocar irise" (vai para 02) e "Editar pronomes" (vai para 01).
  - Interruptor "Dicas do irise nas telas".

### Barra de abas
- Pílula de vidro de 66px com 14px nas laterais e bottom 24.
- Lente branca deslizante (420ms) atrás da aba ativa.
- Cor da aba ativa: Início `#FF6964`, Lugares `#FFA353`, Mapa `#0A8B7A`, Apoio `#6037F0`, Perfil `#2F7FE0`. Abas inativas em `#7C8296`.

## Interactions & Behavior
- **Primeira visita em cada aba** (com as dicas ligadas): o irise abre um diálogo com a fala daquela aba (`falas.json → abas`). Cada aba só mostra a fala uma vez.
- **Avaliar um lugar:**
  - Soma +3 XP e mostra o toast "+3 GOMOS" (pílula escura no topo, 2s) e uma fala de comemoração (pose 6).
  - Se subir de nível, a fala é "SUBIMOS PRO NÍVEL X!" (pose 12).
- **Nível:** 12 gomos por nível. A barra usa o gradiente arco-íris, com 2 segmentos por cor.
- **Flexão de gênero:** todas as falas usam o sufixo escolhido em vez de forma fixa, ex.: `Bem-vind{a|o|e}`, `sozinh{a|o|e}`, `insegur{a|o|e}`, `Famosinh{a|o|e}`.

## Chat com IA
O protótipo usa um helper de demonstração. No app, faça uma chamada para o seu backend e não exponha a chave no cliente.

Prompt de sistema usado:
> Você é {nome do irise} ({pronomes}), "irise" do app Irisa, um mapa colaborativo de lugares acolhedores para pessoas LGBTQIA+ em Curitiba. Sua classe: {classe}. Personalidade: {bio}. Fale português do Brasil, jeito leve e próximo, sem emoji, no máximo 2 frases curtas. A pessoa se chama {nome} e usa {pronomes}; flexione palavras com a terminação "{a|o|e}". Em risco imediato, indique 190 e o Disque 100.

- Envie as últimas 8 mensagens como histórico e use dados reais de lugares no lugar dos exemplos.
- Se a IA falhar, use as respostas de fallback de `falas.json → chatFallback`.

## State Management
- `user`: nome, pronoun, customPronoun e `forma` (0 = a, 1 = o, 2 = e). Persistir no perfil.
- `irise`: índice do personagem escolhido. Persistir.
- `xp` (inteiro): nível = floor(xp/12)+1, progresso = xp%12. Persistir.
- `avaliados`: conjunto de ids de lugares avaliados.
- `seenTabs`: abas já apresentadas. `tips` (boolean).
- `dialog`: `{text, pose, actions[], next?}` mais o início da digitação. Na UI, guardar uma fila de diálogos.
- `chat`: lista de mensagens, `thinking` e `pose`.

## Assets
- `assets/p{pose}-{n}.webp`: corpo inteiro, fundo transparente, altura de até 640px. Usado só na Escolha (pose 1) e na Apresentação (poses 2, 6, 13).
- `assets/b{pose}-{n}.webp`: 300×460, centralizado no tronco, feito para o IriseAvatar.
- **n** (personagem): 1 Theo, 2 Luna, 3 Caio, 4 Kai, 5 Dandara, 6 Rafa, 7 Nina.
- **pose** (folhas de referência originais): 1 neutra, 2 aceno, 3 explicando, 5 pensando, 6 comemorando, 7 acolhendo, 11 apontando, 12 celebrando nível, 13 conversando, 14 preocupado, 15 rindo, 16 orgulhoso, 17 brincalhão.
- Os nomes, as classes, as bios e os atributos dos personagens são provisórios.
- Ícones são traços SVG de 24×24 com stroke de 1.8–2 (paths no HTML, busque por `const ICON`). Se o app já tiver uma biblioteca de ícones, use a dele.

## Files
- `Irisa Assistente.dc.html`: protótipo interativo (referência).
- `data/irises.json`: personagens.
- `data/falas.json`: todas as falas.
- `assets/`: imagens.
