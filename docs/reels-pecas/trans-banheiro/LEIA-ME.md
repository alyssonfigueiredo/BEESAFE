# Reels "O banheiro" — Semana da Visibilidade Trans (13–19/11/2026)

Estado: clipes gerados no Gemini (Veo) e a sobreposição de texto prontos. **Falta renderizar, conferir e pôr na fila.**

## Roteiro (25 s, capa escura, sem áudio — música no Instagram)

| s | Fundo | Texto |
|---|---|---|
| 0–3,6 | clip1-corredor (Rafa olha a porta, dolly-in) | eyebrow "Semana da Visibilidade Trans" · "Pra muita gente, / é só um banheiro." |
| 3,6–7 | idem | "Pra mim, é a parte / do rolê que eu penso / antes de sair." |
| 7–11,5 | clip2-celular (do preocupado ao alívio) | "Alguém já / tinha respondido." + ficha do eixo Banheiro do app ("E o banheiro?" / "Usou o que quis, sem ser questionade.", régua de 5 cores enchendo) |
| 11,5–16 | clip3-porta (empurra a porta e entra, não mostra dentro) | "Quem esteve lá / contou como foi." |
| 16–21 | clip4-mesa (Rafa senta ao lado da Luna, desconhecidos) | "Ninguém devia / precisar de coragem / pra ir ao banheiro." |
| 21–25 | night | "Avalia o banheiro / também." · "Alguém vai ler antes de sair." · @appirisa |

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
