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

## 3. Cores (fonte única: `base.css`, igual a `src/theme/tokens.js`)

| token | hex | uso |
|---|---|---|
| night | #1E2340 | fundo de toda lâmina de Instagram; texto sobre cor |
| night2 | #161B2E | pupila do símbolo, fundo do mark |
| paper | #FAF9F6 | fundo claro (site, catálogo); raro no Instagram |
| coral | #F4736F | urgência, relato, CTA principal, "Mito" |
| orange | #F5A45D | afeto |
| yellow | #F0CA75 | o "a" do wordmark, banheiro, atenção |
| turq | #5CC9B4 | avaliar, acolhimento, "Verdade", eyebrow |
| blue | #6AA8EE | só dentro do arco-íris |
| lilac | #AE96F2 | clientela, halo |
| texto claro | #FFFFFF / #D5D8E4 / #C9CDDD / #8A90A2 | título / corpo / apoio / discreto |
| Ink (escuros) | coralInk #B23C3A, turqInk #1B7A6E… | texto colorido sobre fundo claro (contraste AA) |

**Arco-íris da marca** (sempre nesta ordem, 6 paradas, sem vermelho puro nem verde puro): coral → orange → yellow → turq → blue → lilac. `linear-gradient(90deg, …)` em texto (`.rainbow`) e réguas (`.rule`); `conic-gradient(from -90deg, …, coral)` no anel.

Eixos têm cor fixa: Atendimento coral, Afeto orange, Banheiro yellow, Clientela turq.

## 4. Tipografia

- **Oswald 500** (`--display`), caixa alta, `letter-spacing .03–.06em`, `line-height .95`: títulos, números grandes, eyebrow. Peso 300 para a parte "leve" da frase, 500 para a parte que importa.
- **Space Grotesk 400** (`--body`): corpo, 32–40 px em lâmina de 1080. Nunca caixa alta.
- **Urbanist 500** (`--wordmark`), caixa alta, `letter-spacing .2em`: só a palavra IRISA. O "a" final em yellow.
- Tamanhos de referência (lâmina 1080×1350): eyebrow 28 · título 92–120 · palavra-impacto (`.slam`) 150–230 · corpo 36–40 · apoio 30–34 · rodapé 26.

## 5. Símbolo e marca

- **Símbolo**: anel arco-íris (conic, 6 cores) com centro night e um ponto branco descentrado (olho/radar). Versão completa em `radar.svgfrag` (anel de 96 fatias, varredura turquesa, três pontos, pupila #161B2E). Versão mínima em CSS: `.mark`.
- **Rodapé de toda lâmina**: canto inferior esquerdo `.brand` = mark 30 px + "IRIS" + "a" amarelo. Canto inferior direito `.swipe` = "arraste →" (não na última). Canto superior direito `.num` = "3/8".
- **Assinatura em uma linha** (story, rodapé de peça): símbolo + IRISA + divisor + "Quanta **cor** tem esse lugar?" com "cor" em arco-íris.
- A capa de carrossel nunca é a logo. É o gancho.

## 6. Composição de uma lâmina

Fundo night. Sobre ele, nesta ordem:
1. `.halo.h1` e `.halo.h2`: manchas radiais turquesa/lilás e coral/amarelo, `blur(60px)`, opacidade baixa. Dão profundidade sem virar gradiente.
2. `.grain`: pontilhado branco a 7% em `mix-blend-mode: overlay`. Tira o aspecto "flat de slide".
3. Conteúdo centralizado (`justify-content:center`), largura máxima 860–900 px, margens laterais 60 px.
4. Rodapé fixo (`.brand`, `.swipe`, `.num`).

Padrões de lâmina (escolher um por lâmina, nunca misturar dois):
- **Gancho**: eyebrow colorido + `.big` em duas partes (300 leve / 500 forte com `.rainbow`) + `.body` de uma frase.
- **Palavra-impacto**: `.slam` (uma ou duas palavras, 150–230 px, em `.rainbow` ou coral) + `.body`.
- **Pergunta e resposta**: `.qcard` com a frase entre aspas curvas + `.slam` "Mito." coral ou "Verdade." turquesa + `.body`.
- **Lista**: `.list` (3–4 cartões com `b` em Oswald + `span` em corpo) ou `.grid2` para números (190/192/100/188).
- **Dois lados**: `.two` (dois cartões com borda turq/coral) para "lugar × rua".
- **Riscado**: `.strike` para negar uma ideia ("~~derruba~~", "~~região tranquila~~").
- **Nota**: `.nring` (anel conic com 4.7 no centro) + `.badge-big` "Acolhedor".
- **Fecho**: pergunta para comentário + `.pill` coral "O link está na bio" + `.small` "em fase de testes · Android".

Story (1080×1920, `.sl.story`): mesma gramática, mais ar, e uma **área tracejada** (`.zone`) onde entra o adesivo do Instagram (quiz, enquete, caixa de pergunta, link). O link nunca é escrito na arte.

## 7. Como raciocinar um carrossel

1. **Uma tese por carrossel**, dita na capa como pergunta ou choque ("Aconteceu na esquina do bar. A culpa é do bar?").
2. Lâmina 2 responde em uma palavra (`.slam`). Lâminas 3–6 explicam uma coisa cada, em ordem de "o que é → como funciona → o que não é".
3. Sempre uma lâmina que **nega o erro comum** (riscado ou "Mito.").
4. Fecho pede comentário com pergunta concreta ("qual foi o último lugar que te fez sentir bem-vinde?"), não "curta e compartilhe".
5. 7 ou 8 lâminas. Menos de 6 vira post único.
6. Texto cabe: título de duas linhas, corpo de até 3 linhas. Se não cabe, corta palavra, não fonte.
7. Legenda repete a tese, lista o miolo em linhas curtas, fecha com a pergunta e "o link está na bio". Fixar comentário com bit.ly/appirisa.

## 8. Referências (o que já existe, para copiar o jeito)

- `docs/carrossel.html` (estreia), `carrossel-2.html` (quatro perguntas), `carrossel-3.html` (anonimato), `carrossel-4.html` (emergência), `carrossel-5.html` (regra da rua), `carrossel-6.html` (mito ou verdade), `post-bemvinde.html`, `stories-2.html`.
- `docs/story.html` (vídeo de 60 s, dez cenas), `docs/index.html` (landing), `docs/pitch.html` (apresentação).
- `docs/lojinha.html` e `scripts/lojinha/build.py`: mockups de produto em SVG com o mesmo sistema (fundo claro `paper` aceito ali).
- Legendas e cronogramas anteriores: pasta Irisa-lancamento e Irisa-semana2 (uma pasta por dia, `legenda.txt` no feed, `texto.txt` no story).

## 9. Pipeline

1. Copiar `template.html` para `docs/NOME.html`, trocar o `<link>` por `<style>` com o conteúdo de `base.css` (as fontes carregam do Google Fonts).
2. Uma `<section class="sl">` por lâmina. Story: `class="sl story"`.
3. Exportar: `node scripts/carrossel-png.mjs docs/NOME.html` → `docs/NOME/01.png…` (Playwright, Chromium em `/opt/pw-browsers/chromium`; `SCALE=2` para 4K).
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
