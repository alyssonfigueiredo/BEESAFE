# Reels "O banheiro" — Semana da Visibilidade Trans (13–19/11/2026)

Estado: clipes gerados no Gemini (Veo) e a sobreposição de texto prontos. **Falta renderizar, conferir e pôr na fila.**

## Roteiro (42,5 s, versão de 14/11/2026: intro do Gemini, texto embaixo, som dos clipes)

Texto sempre na parte de baixo (termina a 570 px do fundo), para não cobrir o rosto. Cada linha entra em 1,5 s.

| s | Fundo | Texto |
|---|---|---|
| 0–7 | clip0-intro (Gemini: corredor escuro, a porta abre uma fresta e fecha) | "Tem uma porta / que quase ninguém repara." · eyebrow "Semana da Visibilidade Trans" |
| 7–12,5 | clip1-corredor (1,15x mais lento) | "Pra muita gente, / é só um banheiro." |
| 12,5–18,5 | idem | "Pra mim, é a parte / do rolê que eu penso / antes de sair." |
| 18,5–25 | clip2-celular (do preocupado ao alívio) | "Alguém já / tinha respondido." + ficha do eixo Banheiro em cartão de vidro escuro |
| 25–30,5 | clip3-porta (empurra a porta, entra, a porta fecha) | "Quem esteve lá / contou como foi." |
| 30,5–37 | clip4-mesa (Rafa senta ao lado da Luna) | "Ninguém devia / precisar de coragem / pra ir ao banheiro." |
| 37–42,5 | night | "Avalia o banheiro / também." · "Alguém vai ler antes de sair." · @appirisa |

Personagens: Rafa (irise 15, homem trans) e Luna (18, mulher trans). A Luna NÃO é autora da avaliação (anonimato).
Os textos de "Banheiro" vêm de `src/theme/domain.ts` (`restroom`).

## Como renderizar (sessão cloud)

```bash
export PW=/opt/node22/lib/node_modules/playwright/index.mjs   # no cloud; no Mac, npm ci e sem PW
node docs/reels-pecas/trans-banheiro/render.mjs --previa   # PNGs prev-*.png nesta pasta, conferir antes
node docs/reels-pecas/trans-banheiro/render.mjs            # gera docs/Irisa-reels-trans-banheiro.mp4, já com som
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

## Som (14/11/2026)

Pedido do Leandro: aproveitar o áudio que o Gemini gera junto com os clipes (bordão grave, lâmpada, porta
rangendo, bar). `som.py` põe o áudio original dos cinco clipes na frente, nos mesmos cortes do vídeo, e a
música de `trilha.py` (piano + pad sintetizados, sem música de terceiros) baixinha por baixo, só a partir
dos 7 s: a intro fica só com o som do Gemini. `render.mjs` chama `som.py` sozinho e nivela em -16 LUFS.
Mudou a duração de uma cena? Ajustar: cenas em `gerar-sobreposicao.mjs`, `CORTES` em `render.mjs`, os
cortes em `som.py` e a tabela de tempos `M` em `trilha.py`.
Capa: quadro dos 10,8 s (`docs/Irisa-reels-trans-banheiro-capa.jpg`).
`intro-referencia.png` + o prompt abaixo foram o que gerou o `clip0-intro.mp4`.

## Prompt da intro (Gemini/Veo, com `intro-referencia.png` como primeiro quadro)
```
Animate this image as the first frame. Vertical 9:16, 8 seconds, one continuous shot, no cuts.
Stylized 3D animation, same look as the image: a narrow wood-paneled back hallway of a bar at night, almost dark, lit only by the single bare ceiling bulb.
Action: a very slow, steady dolly-in toward the closed wooden door at the end of the hallway. The bulb flickers softly twice, then steadies. A thin line of warm golden light glows under the door and along its edge and slowly gets brighter; a faint shadow passes behind it once. Fine dust floats in the light. The door stays closed the whole time.
Mood: mysterious, intimate, quiet, cinematic, shallow depth of field.
No people, no hands, no text, no signs, no symbols or pictograms on the door, no logos. Keep the bottom third of the frame dark and empty.
Audio: muffled bar music and distant voices behind the wall, soft electric hum of the bulb. No narration.
```
