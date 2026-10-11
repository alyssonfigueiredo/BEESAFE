# Irise — pacote final aprovado (Etapa 2 + ajustes)

11/10/2026 · **tudo abaixo está aprovado e no app**: já no código (branches atualizadas), sai por EAS Update, sem build.
Prints em anexo: `print-escolha.png`, `print-inicio.png`, `print-inicio-rolada.png`, `print-chat.png`
(mock fiel ao código, 390×844) e `anel-girando.gif`.

## O que foi aplicado (conforme as respostas do pacote 14)

**Escolha**
- Miniaturas removidas; setas, arraste 1:1 e vizinhos ficaram.
- Cartão flutuante de verdade: 12 pt das laterais, 12 pt + área segura embaixo — o "Usar Ali" não corta mais.
- Linha única: NOME em maiúsculas (Oswald 34/36) + chip de pronome cinza (24 pt, minúsculo, #F1F5FA/#3D4560) + classe à direita (11, .14em, #9C6C00).
- Bio 13,5/19,5 com altura mínima; atributos em 2 colunas de 47%, rótulo MAIÚSCULO .08em, segmentos de canto 2, espaços 3/5/9×16.
- Botão "USAR {NOME}" 54/27, tracking .76, sombra turquesa .35.
- Título "ESCOLHA" leve + "SEU IRISE" forte, lh 34; contador Oswald 15 #8E96AE; laterais 20.
- Palco: busto 250 a 28 pt da base (encolhe sozinho só se a tela for curta demais); brilho de 520 centrado no círculo, pulso 1,5 s .55→.90 / .94→1.04; setas de vidro, top 150, traço 2.4.
- Avatar: sombra lilás no círculo, fundo radial 28%/78%, busto a 118% da área interna.

**Início**
- Sombra do balão (0 10 18 lilás .14), do irise no card (0 14 22 preta .35) e na faixa (0 10 18 preta .3).
- Pontinhos do balão com transição de 0,3 s; "ALI · SEMPRE ON-LINE" com tracking 1.4.
- Espaço cabeçalho→balão caiu para ~10 pt (igual ao balão→card).
- Botões do card sem a sombra colorida extra que a spec não tinha.
- Falas e arraste mantidos como o app (respostas 4 e 5).

**Fotos**
- Os 18 arquivos do Ali (pacote 17, poses 1–6 nas versões clara, -escuro e avatar-card) estão no app, conferidos byte a byte.

## Ajustes finais (aprovados em 11/10/2026)

- **Vizinhos do carrossel:** imagem original a 0,5 + cópia tingida `#8E96AE` a 0,6 por cima (o tintColor sozinho virava silhueta chapada). O conjunto ainda fica a 0,5 pela distância do carrossel.
- **Anel do avatar: GIRANDO** — 1 volta a cada 40 s (`anel-girando.gif` compara com o parado); com "reduzir movimento" ligado no celular, para sozinho. Decisão do Alysson, aprovada.
- **Balão da Início alinhado aos cards:** a borda direita termina a 12 pt da tela (igual ao card da cidade), não mais a 44; a ponta andou +32 pt pra dentro e segue caindo no mesmo lugar, à esquerda da cabeça do irise, sem encostar no cabelo.

Fechado. Ajuste novo, mandar no formato de sempre (lista do que mudar, com medidas).
