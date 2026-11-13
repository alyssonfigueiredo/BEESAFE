# Reels "O banheiro" — Semana da Visibilidade Trans (13–19/11/2026)

Estado: clipes gerados no Gemini (Veo) e a sobreposição de texto prontos. **Falta renderizar, conferir e pôr na fila.**

## Roteiro (41,5 s, versão lenta de 13/11/2026, com trilha própria)

Texto sempre na parte de baixo (termina a 570 px do fundo), para não cobrir o rosto. Cada linha entra em 1,5 s.

| s | Fundo | Texto |
|---|---|---|
| 0–6 | escuro, fresta de luz de porta entreaberta; aos 5,2 s a "porta" abre para o corredor | "Tem uma porta / que quase ninguém repara." · eyebrow "Semana da Visibilidade Trans" |
| 6–11,5 | clip1-corredor (1,23x mais lento) | "Pra muita gente, / é só um banheiro." |
| 11,5–17,5 | idem | "Pra mim, é a parte / do rolê que eu penso / antes de sair." |
| 17,5–24 | clip2-celular (do preocupado ao alívio) | "Alguém já / tinha respondido." + ficha do eixo Banheiro em cartão de vidro escuro |
| 24–29,5 | clip3-porta (empurra a porta e entra) | "Quem esteve lá / contou como foi." |
| 29,5–36 | clip4-mesa (Rafa senta ao lado da Luna) | "Ninguém devia / precisar de coragem / pra ir ao banheiro." |
| 36–41,5 | night | "Avalia o banheiro / também." · "Alguém vai ler antes de sair." · @appirisa |

Personagens: Rafa (irise 15, homem trans) e Luna (18, mulher trans). A Luna NÃO é autora da avaliação (anonimato).
Os textos de "Banheiro" vêm de `src/theme/domain.ts` (`restroom`).

## Como renderizar (sessão cloud)

```bash
npm ci   # se node_modules não existir (precisa do playwright-core)
node docs/reels-pecas/trans-banheiro/render.mjs --previa   # 6 PNGs prev-*.png nesta pasta, conferir antes
node docs/reels-pecas/trans-banheiro/render.mjs            # gera docs/Irisa-reels-trans-banheiro.mp4
```

- ffmpeg com libx264 no PATH (ou `FFMPEG=`). Chromium em `/opt/pw-browsers/chromium`.
- `fundo.mp4` e `ov-*.png`/`prev-*.png` são intermediários: não commitar.
- Mudou texto? Editar `gerar-sobreposicao.mjs` (bloco no fim; o começo é o motor de reels da skill),
  rodar `node gerar-sobreposicao.mjs`, que grava em `./html/trans-banheiro.html`, e copiar para `sobreposicao.html`.
- Cortes dos clipes: array `CORTES` em `render.mjs`.

## O que conferir na prévia

- Texto legível sobre o vídeo (há gradiente escuro no topo); nada nos 220 px de cima nem nos 540 de baixo.
- Marca (`#radarmin` + IRISa) a 440 px do fundo, sem brigar com o rosto.
- clip2 tem uma plaquinha "EXIT" vermelha pequena no alto do corredor: se aparecer legível, subir o crop ou aceitar.
- clip1 está em render mais realista que os outros: se destoar demais, pedir novo clipe ao Gemini.

## Depois

1. Capa: um quadro do clip1 com o texto da 1ª cena (escura → mantém o xadrez: lugares-casa 15/11 é clara).
2. Entrada em `docs/legendas/fila.json` (id `reels-trans-banheiro`, tipo REELS, `quando` 17 ou 18/11 ~19h,
   `aprovado: false` — só a sessão da conta do Alysson marca aprovação). Legenda neutra, sem "seguro",
   5 hashtags: `#Irisa #LGBTQIA #Orgulho #AppLGBT #VisibilidadeTrans`; pedir comentário:
   "qual lugar te tratou pelo nome certo de primeira?".
3. Resto da semana (planejado, não feito): 16/11 story caixinha (mesma pergunta); 18/11 post frase clara
   "Nome não é apelido. Pronome não é opinião."; 20/11 Dia da Memória Trans: post sóbrio, sem CTA, sem app,
   número só do Dossiê ANTRA com fonte, não usar a irise Dandara.

## Trilha (13/11/2026)

O vídeo final leva trilha própria, sintetizada por `trilha.py` (piano + pad, 41,5 s, sem música de terceiros).
`render.mjs` gera o vídeo mudo; depois: `python3 trilha.py trilha.wav` e juntar com
`ffmpeg -i video.mp4 -i trilha.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-15:TP=-1.5 -c:a aac -b:a 192k saida.mp4`.
Mudou a duração de uma cena? Ajustar os três lugares: cenas em `gerar-sobreposicao.mjs`, `CORTES` em `render.mjs`
e a tabela de tempos `M` em `trilha.py`. No cloud: `PW=/opt/node22/lib/node_modules/playwright/index.mjs`.
Capa: quadro dos 9,8 s (`docs/Irisa-reels-trans-banheiro-capa.jpg`).
