# Cronograma — otimizado com dados de 2026 (Metricool, Buffer, estudos de algoritmo)

Regra fixa em todo post: fixar o primeiro comentário com **bit.ly/appirisa**. Responder todo
comentário no mesmo dia. Link nunca vai na legenda nem na arte, só no comentário fixado e na bio.

## Por que esses horários e dias

- **Terça a quinta, 19h**: janela de maior engajamento em 2026 segundo Buffer (9,6M posts) e
  Metricool — bate com o pico real de todo dia (18h–21h) e evita concentrar tudo no fim de
  semana, que os dados não mostram como mais forte pra alcance.
- **Meio-dia pros stories**: segundo pico do dia (pausa de almoço), usado pra manter presença
  nos dias sem post de feed em vez de deixar buraco.
- **Carrossel > post único**: maior taxa de engajamento de qualquer formato em 2026 (~0,50%
  por seguidor) — mantido como base pros temas educativos.
- **CTA de salvar/compartilhar**: shares por DM e salvamentos pesam mais que curtida e mais
  que comentário simples no ranking de 2026; ajustado o fecho do carrossel 3 pra pedir "salva"
  além de comentar.

## Calendário

| dia | hora | peça | legenda |
|---|---|---|---|
| sáb 26/09 | 18h | story `story-hoje.png` (radar + "e se a resposta já estivesse no mapa?") | sem legenda |
| dom 27/09 | 12h | story `story-cidades.png` (sete cidades no ar) | sem legenda |
| ter 29/09 | 19h | **reels 4** — Sem nome. Sem perfil. Sem rastro. (32 s, `Irisa-reels-4.mp4`) | `reels-4.txt` |
| qua 30/09 | 19h | post-bemvinde | `post-bemvinde.txt` |
| qui 01/10 | 19h | carrossel 4 — Emergência e apoio por cidade | `carrossel-4.txt` |
| sex 02/10 | 12h | story `stories-2/01` (quiz) | `stories-2.md` § 1 |
| sáb 03/10 | 12h | story `stories-2/02` (caixa de pergunta) | `stories-2.md` § 2 |
| dom 04/10 | 12h | story `stories-2/03` (enquete) | `stories-2.md` § 3 |
| seg 05/10 | 12h | story `stories-2/04` (três coisas que o app não pede) | `stories-2.md` § 4 |
| ter 06/10 | 19h | **reels 3** — A culpa é do bar? O lugar recebe cor, a rua recebe aviso. (34 s, `Irisa-reels-3.mp4`) | `reels-3.txt` |
| qua 07/10 | 19h | carrossel 6 — Mito ou verdade | `carrossel-6.txt` |
| qui 08/10 | 19h | **reels 5** — Quantos relatos tem o seu bairro? (ficha do bairro, 36 s, `Irisa-reels-5.mp4`) | `reels-5.txt` |
| dom 11/10 | 12h | carrossel 8 — Fora do armário. Dentro do mapa. (Dia de Sair do Armário) | `carrossel-8.txt` |

Termina 08/10, dois dias antes do fim do teste fechado (10/10) — folga proposital. O carrossel 8 é
o único depois disso, porque é preso à data (11/10, Dia de Sair do Armário).

## Reels (26/09, sessão dos reels)

Decisão dele: reels engaja mais, então os temas viram reels **no lugar** do carrossel do mesmo
tema, não depois dele (um reels repetindo um carrossel já postado não faz sentido). Os
carrosséis 3, 5 e 7 continuam renderizados em `docs/` como reserva; as lâminas isoladas servem
de story (por exemplo a lâmina dos quatro números do carrossel 4).

- `reels-3` regra da rua (34 s) ← carrossel 5 · `reels-4` anonimato (32 s) ← carrossel 3 ·
  `reels-5` ficha do bairro (36 s) ← carrossel 7. Todos 1080×1920, H.264, sem áudio (música
  entra no Instagram, instrumental, sem voz, para o texto ser lido).
- Capa do reels: escolher no Instagram o quadro do gancho ("Ser identificade." / "Não." / "Zero").
- Reels não aceita adesivo nem link na legenda: fecho "O link está na bio" + @irisapp na arte.
- No dia seguinte, republicar o reels no story com adesivo de link.
- Fonte: `docs/reels-N.html` (cenas com Web Animations presas a `window.__setT`), render com
  `node scripts/story-video.mjs docs/reels-N.html` (ffmpeg com libx264; ver SKILL.md).

Ideias mapeadas para os próximos reels (não feitas): "como chegar" da ficha do lugar; bastidores
do mapa (10 mil lugares da base aberta Overture, sem nota até alguém irisar); mural de apoio e
aba Apoio por cidade; uma cidade por reels (7 reels de 15 s, "Curitiba já está no mapa").
Datas: 26/10 Dia da Visibilidade Intersexo; última semana de outubro, Visibilidade Assexual;
29/01 Visibilidade Trans e Travesti.

## Correções (26/09)

Duas vezes eu errei sobre conteúdo já publicado, supondo "sem uso" só por não achar onde
tinha ido ao ar:

- **`Irisa-reels.mp4`**: eu tinha colocado como `reels-1` em 01/10 20h achando que era Reels
  novo sem uso. Não é — **já foi postado no Instagram em 01/10**. Removido da fila.
- A sequência de teaser (`post-aviso`, `story-aviso`, `story-revelacao`, `post-chegada`,
  `story-quadrinho-marca`) também **já foi postada** — não é backlog, é histórico. Não voltou
  pra fila.

**Continua valendo o problema real**: não existe Reels novo, sem uso, pronto pra publicar.
Se quiser alcance maior que carrossel/imagem única (o formato com melhor distribuição pra
quem ainda não segue a conta), esse é o próximo trabalho de verdade — construir do zero, não
reaproveitar nada já postado.

Fontes: Buffer (9,6M posts), Metricool Instagram Study 2026, Later/Hootsuite guias de
algoritmo 2026, Social Insider (6M reels).
