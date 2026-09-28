---
name: irisa-posts
description: Gera posts, carrosséis e stories do Instagram da Irisa (app LGBTQIA+ de acolhimento e relatos) no estilo visual da marca. Use sempre que pedirem post, carrossel, story, lâmina, capa, imagem para Instagram, legenda, cronograma ou "mais conteúdo" da Irisa, mesmo sem dizer Instagram.
---

# Irisa · geração de posts

Leia inteiro antes de gerar. O estilo é uma linguagem fechada: cores, fontes, composição e tom. Não invente fora dela.

## 1. O que é a Irisa (para escrever certo)

App brasileiro para a comunidade LGBTQIA+. Duas coisas, e a regra que as separa:

- **Irisar um lugar**: avaliar bar, café, restaurante, balada, hotel em quatro eixos de acolhimento, de 1 a 5, respondidos por quem esteve lá. Atendimento (30%), Afeto (30%), Banheiro (25%), Clientela (15%). Os quatro viram nota e selo. Selo só depois de 5 avaliações.
- **Registrar um relato**: LGBTIfobia na rua, praça, transporte, dentro de um lugar. Anônimo. Relatos num raio de 100 m viram nível de atenção da região: **atenção** (1 a 3 em 180 dias) ou **alerta** (4+, ou graves, que pesam 3×).
- **A regra**: *o lugar recebe cor, a rua recebe aviso.* Relato na esquina não derruba a nota do bar; só relato que aponta o lugar desconta.
- **Nunca existe "região tranquila"** nem "lugar seguro". Sem relato = ninguém registrou. Essa é a decisão mais importante do produto e vale para todo texto.
- Anonimato por construção: sem autor na base pública, sem página de perfil, ponto deslocado ~100 m em relato de hoje/ontem, só e-mail para entrar, excluir conta apaga tudo.
- Botão de emergência: 190, 192, 100, 188. Aba Apoio com serviços por cidade.
- Sete cidades com lugares no mapa: Curitiba, Recife, João Pessoa, Joinville, Natal, São Paulo, Rio. Em fase de testes, Android primeiro.
- Link: bit.ly/appirisa (vai na bio e no adesivo de story, nunca escrito na arte). Instagram @irisapp.

## 2. Tom de voz

- Português do Brasil, direto, frases curtas, ponto final. Uma ideia por lâmina.
- Segunda pessoa ("você"), e "a gente" para falar da comunidade e do app. Nunca "nós, a equipe".
- **Palavra da marca: "bem-vinde"**. Linguagem neutra em todo texto: identificade, questionade, recebide, não-binárie.
- **Frase oficial: "Quanta cor tem esse lugar?"** Sempre com "cor" em arco-íris quando destacada.
- Frases de apoio já aprovadas: Bem-vinde aqui · O lugar recebe cor. A rua recebe aviso · Estrelas não dizem nada pra gente · Quem esteve lá responde · Sem nome. Sem perfil. Sem rastro · Irise você também · Já irisei esse lugar · Cor é medida · Feito por nós · Fora do armário. Dentro do mapa · Aquenda esse lugar · Mona, avalia · Estamos aqui. E no mapa · Não é fase. É endereço · Bandeira na porta não basta · A rua também é nossa · Silêncio não é nota · Ninguém solta a mão de ninguém.
- **Proibido**: "seguro", "lugar seguro", "região tranquila", "selo de segurança"; número de testadores ou dias de teste; "me ajuda", "apoie o projeto" (a pegada é exclusividade: "ser das primeiras pessoas"); listar categorias como se fossem tudo ("bar, café e balada"); nome de bar real sem autorização; logo, frase ou trecho de artista/marca.
- Emoji só na legenda, nunca na arte. Hashtags no fim da legenda: #Irisa #LGBTQIA #Orgulho #AppLGBT + cidades.

## 3. Cores (fonte única: `base.css`)

Padrão desde 27/09/2026 (mesmo do app, `src/theme/tokens.js` com `SATURATION = 1.35`): **fundo papel claro**, seis acentos com saturação ×1.35, tinta escura. O fundo night escuro dos carrosséis 1–7 é o padrão antigo: não copiar.

| token | hex | uso |
|---|---|---|
| paper | #F5F4F1 | fundo de toda lâmina |
| surface / subtle / border | #FFFFFF / #ECEAE5 / #E6E3DD | painéis opacos, mapa, divisórias |
| ink (night) | #141829 | título, texto principal, texto sobre cor |
| muted / dim | #3D4560 / #7C8296 | corpo / eyebrow, numeração, "arraste" |
| pupil | #0F1220 | pupila do símbolo |
| coral | #FF6964 | urgência, relato, CTA principal, "Mito" |
| orange | #FFA353 | afeto |
| yellow | #FFD066 | o "a" do wordmark (≥20 px), banheiro, atenção |
| turq | #49DCC0 | avaliar, acolhimento, "Verdade" |
| blue | #59A7FF | só dentro do arco-íris |
| lilac | #A889FF | clientela, halo |
| amber | #FFAD0F | o "a" do wordmark abaixo de 20 px |
| Ink (escuros) | coralInk #C72825, orangeInk #AB6207, yellowInk #9C6C00, turqInk #0A8B7A, lilacInk #6037F0 | **texto colorido sobre papel** (contraste AA). Cor cheia só em fundo de cápsula/pílula, nunca em texto pequeno |

**Arco-íris da marca** (sempre nesta ordem, 6 paradas): coral → orange → yellow → turq → blue → lilac. `--rb` em texto (`.rainbow`) e réguas (`.rule`); `conic-gradient` no anel de nota.

Eixos têm cor fixa: Atendimento coral, Afeto orange, Banheiro yellow, Clientela turq.

**Liquid Glass**: cartão = `.pane` (branco a 62 %, `--shadow-card` dupla, borda de luz `--glass-inset`, blur 18 px saturate 1.4), raios 28/24/18 (`--r-xl/lg/md`), botões em cápsula (`.btn`, `.ct`, `.tag`). Variante escura `.dark` (night a 90 %) só para um cartão de contraste, nunca a lâmina inteira. Cartões e botões opacos de propósito.

## 4. Tipografia

- **Oswald 700** (`--display`), caixa alta, `letter-spacing .01em`, `line-height .98`: títulos, números grandes. `.lt` (peso 400) para a parte "leve" da frase, 700 para a parte que importa.
- **Space Grotesk** (`--body`): corpo 400, 36–40 px em lâmina de 1080; eyebrow, numeração, botões e chips em 600. Nunca caixa alta no corpo; eyebrow em caixa alta com `.14em`.
- **Urbanist 500** (`--wordmark`), caixa alta, `letter-spacing .2em`: só a palavra IRISA. O "a" final em amber (rodapé) ou yellow (grande).
- Tamanhos de referência (lâmina 1080×1350): eyebrow 28 · título 92–120 · palavra-impacto (`.slam`) 150 · corpo 36–40 · apoio 30–34 · rodapé 28.

## 5. Símbolo e marca (reset de 27/09/2026, `docs/marca.html` e `docs/marca-pack/LEIA-ME.txt`)

`radar.svgfrag` é o conteúdo de um `<defs>` com dois símbolos; cola uma vez logo depois de `<body>` dentro de `<svg style="position:absolute;width:0;height:0"><defs>…</defs></svg>`:
- **`#radarmark`** = símbolo completo (anel de 48 gomos, varredura turquesa, três pontos, pupila #0F1220 com brilho). Só a partir de **50 px**: marca vertical, horizontal, fecho de reels (`.handle` com @irisapp a 78 px), capa de story.
- **`#radarmin`** = **redução**: só o anel colorido, centro vazio, sem pupila. É a **assinatura de post**: rodapé de toda lâmina e de todo reels, ícone ao lado de @irisapp abaixo de 50 px. Mínimo 20 px.
- Nunca: círculo liso em CSS, cor única, preto e branco, esticar, girar, sombra, `filter:saturate` por cima (o fragmento já vem na paleta ×1.35).
- **Rodapé de toda lâmina**: canto inferior esquerdo `.brand` = `#radarmin` 36 px + "IRIS" + "a" amber. Canto inferior direito `.swipe` = "arraste →" (não na última). Canto superior direito `.num` = "3/8". No reels e no story o `.brand` fica centralizado a 120 px do fundo.
- A capa de carrossel nunca é a logo. É o gancho.
- Vinheta em vídeo: `docs/abertura.html` (4,2 s, `?formato=quadrado|story&bg=paper|night`), MP4 prontos em `docs/marca-pack/video/`.

## 6. Composição de uma lâmina

Fundo papel. Sobre ele, nesta ordem:
1. `.bg`: quatro manchas radiais nos cantos (turq, coral, lilás, amarelo em `color-mix`), sem blur. Dão cor sem virar gradiente.
2. Conteúdo centralizado (`justify-content:center`), largura máxima 860–900 px, padding lateral 80 px.
3. Rodapé fixo (`.brand`, `.swipe`, `.num`).

Padrões de lâmina (escolher um por lâmina, nunca misturar dois):
- **Gancho**: eyebrow em cor Ink + `.big` em duas partes (`.lt` leve / 700 forte com `.rainbow` ou cor Ink) + `.body` de uma frase.
- **Palavra-impacto**: `.slam` (uma ou duas palavras, 150 px, em `.rainbow` ou coralInk) + `.body`.
- **Pergunta e resposta**: `.qcard` com a frase entre aspas curvas + `.slam` "Mito." coralInk ou "Verdade." turqInk + `.body`.
- **Lista**: `.list` (2–4 painéis de vidro com `b` em Oswald na cor Ink + `span` em corpo) ou `.grid2` para números (190/192/100/188).
- **Riscado**: `.strike` para negar uma ideia ("~~região tranquila~~").
- **Nota**: `.nring` (anel conic com 4.7 no centro branco) + `.badge-big` "Acolhedor".
- **Cidades**: `.pills` com `.ct` (cápsulas em cor cheia, texto night).
- **Fecho**: pergunta para comentário + `.btn` coral "O link está na bio" + eyebrow "em fase de testes · Android".

Story (1080×1920, `.sl.story`): mesma gramática, mais ar, marca centralizada no rodapé e uma **área tracejada** (`.zone`) onde entra o adesivo do Instagram (quiz, enquete, caixa de pergunta, link). O link nunca é escrito na arte.

Reels (`docs/reels-3..9.html` como referência): mesmo CSS dentro de `#stage` 1080×1920, cenas em Web Animations presas a `window.__setT`, eyebrow com o nome da série na cena 0, assinatura "cinza vira cor" (`grayscale` no `#col` até o momento da virada), fecho `.handle` com `#radarmark` 78 px + @irisapp e `.brand` com `#radarmin`. Render: `FFMPEG=… node scripts/story-video.mjs docs/reels-N.html docs/Irisa-reels-N.mp4`. Sempre mostrar quadros estáticos antes de renderizar.

## 7a. Perfil zero (decisão de 27/09/2026)

Para quem não segue a conta, conteúdo que explica o app não segura 3 segundos. A sequência de ataque começa por reels curtos de reconhecimento (uma cena da vida de quem assiste, sem dizer "Irisa" na abertura), cada um pedindo um sinal só (compartilhar por DM, replay, comentar "eu" ou a cidade), e só depois entram os reels e carrosséis que apresentam o produto. Regras: gancho legível em 1 s sem contexto, sem pausa morta (cena nova a cada 4–6 s), texto grande porque a maioria assiste sem som, @irisapp só no fecho. Nunca prometer alcance nem correr atrás de trend sem relação com o tema.

## 7. Como raciocinar um carrossel

1. **Uma tese por carrossel**, dita na capa como pergunta ou choque ("Aconteceu na esquina do bar. A culpa é do bar?").
2. Lâmina 2 responde em uma palavra (`.slam`). Lâminas 3–6 explicam uma coisa cada, em ordem de "o que é → como funciona → o que não é".
3. Sempre uma lâmina que **nega o erro comum** (riscado ou "Mito.").
4. Fecho pede comentário com pergunta concreta ("qual foi o último lugar que te fez sentir bem-vinde?"), não "curta e compartilhe".
5. 7 ou 8 lâminas. Menos de 6 vira post único.
6. Texto cabe: título de duas linhas, corpo de até 3 linhas. Se não cabe, corta palavra, não fonte.
7. Legenda repete a tese, lista o miolo em linhas curtas, fecha com a pergunta e "o link está na bio". Fixar comentário com bit.ly/appirisa.

## 8. Referências (o que já existe, para copiar o jeito)

- **Padrão novo (papel + Liquid Glass): `docs/carrossel-8.html` (fora do armário) e `carrossel-9.html` (viajar em casal)** e os reels 3–9. Padrão antigo (night), só para o texto: `docs/carrossel.html` (estreia), `carrossel-2.html` (quatro perguntas), `carrossel-3.html` (anonimato), `carrossel-4.html` (emergência), `carrossel-5.html` (regra da rua), `carrossel-6.html` (mito ou verdade), `carrossel-8.html` (Dia de Sair do Armário, 11/10), `post-bemvinde.html`, `stories-2.html`.
- `docs/story.html` (vídeo de 60 s, dez cenas), `docs/reels-3.html` (regra da rua, 34 s), `docs/reels-4.html` (anonimato, 32 s), `docs/reels-5.html` (ficha do bairro, 36 s): carrosséis convertidos em cenas de 4–6 s, uma ideia por cena, número contando (`count`), fecho com pílula + @irisapp. `reels-6` a `reels-9` (15–20 s): **reels para quem não conhece o perfil**, gancho de reconhecimento sem jargão ("Você já soltou a mão em público?", "Mudei de calçada 4 vezes hoje", "A bandeira na porta não diz nada", "Sua cidade está no mapa?"), o app só aparece na última cena, e cada um pede um sinal (compartilhar, replay, comentar). `carrossel-8.html` (Dia de Sair do Armário), `carrossel-9.html` (viajar em casal, feito para salvar). `docs/index.html` (landing), `docs/pitch.html` (apresentação).
- `docs/lojinha.html` e `scripts/lojinha/build.py`: mockups de produto em SVG com o mesmo sistema (fundo claro `paper` aceito ali).
- Legendas e cronogramas anteriores: pasta Irisa-lancamento e Irisa-semana2 (uma pasta por dia, `legenda.txt` no feed, `texto.txt` no story).

## 9. Pipeline

1. Copiar `template.html` para `docs/NOME.html`, trocar o `<link>` por `<style>` com o conteúdo de `base.css` (as fontes carregam do Google Fonts).
2. Uma `<section class="sl">` por lâmina. Story: `class="sl story"`.
3. Exportar: `node scripts/carrossel-png.mjs docs/NOME.html` → `docs/NOME/01.png…` (Playwright, Chromium em `/opt/pw-browsers/chromium`; `SCALE=2` para 4K).
   Reels: `node scripts/story-video.mjs docs/NOME.html` → `docs/Irisa-NOME.mp4` (a página expõe `window.__setT(ms)` e `window.__TOTAL`; copiar o head e os helpers de `docs/reels-5.html`). Precisa de ffmpeg com libx264: no ambiente cloud não tem no PATH, use `pip download imageio-ffmpeg`, extraia o wheel e aponte `FFMPEG=` para o binário; no Mac `brew install ffmpeg`.
4. Conferir num contact sheet antes de entregar: texto vazando, cartão cortado, rodapé sobreposto.
5. Entregar: pasta por dia com imagens numeradas + `legenda.txt` (feed) ou `texto.txt` (story, com o que vai em cada adesivo), zip por semana, e as fontes commitadas em `docs/`.

## 10. Checklist antes de entregar

- [ ] Nada diz "seguro" ou "tranquilo".
- [ ] "bem-vinde", "identificade" etc. (neutro).
- [ ] "cor" em arco-íris quando a frase oficial aparece.
- [ ] Capa é gancho, não logo. Rodapé com mark + IRISa em toda lâmina.
- [ ] Sem link escrito na arte; sem número de testadores; sem emoji na arte.
- [ ] Fecho com pergunta + "O link está na bio" + "em fase de testes · Android".
- [ ] Arco-íris na ordem coral → orange → yellow → turq → blue → lilac.
- [ ] Título ≤ 2 linhas, corpo ≤ 3 linhas, nada cortado nas bordas.
