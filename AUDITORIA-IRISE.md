# Auditoria Irise — Escolha + Início (pacote 13, Etapa 1)

10/10/2026 · comparação do app com o design aprovado, item a item. **Nada foi alterado no código ainda** — o pacote pede aprovação antes de corrigir.

## Resumo em 3 linhas

- A **Início está praticamente certa**: card da cidade, balão com ponta curva, falas, pílula "Falar com Ali", faixa Sempre on-line, chat e a marca original no cabeçalho.
- A **Escolha concentra as diferenças** — e o problema principal é real: **o botão "Usar Ali" corta no fim da tela no app**, porque a soma das partes não cabe nos 844 pt de um iPhone comum.
- As **6 fotos do Ali** (b1-12 a b6-12) já foram trocadas pela versão final com borda suave — o moletom está liso.

## O que está igual ao design (não mexer)

Card da cidade (medidas, cores, textos, botões, brilho lilás) · balão (forma de uma peça só, ponta curva, opacidade .55, padding, fontes, pontinhos, "Ali" com inicial maiúscula, flutuação 3,4 s, rodada de 4 s que para na última fala, × esconde, CTA vai direto) · pílula (todas as medidas) · chat (abertura da fala + 2 respostas rápidas, pose por mensagem, imagem clara) · pulso do brilho (1,5 s, .55→.90, escala .94→1.04) · troca do carrossel (500 ms, mesma curva) · botão flutuante antigo já não existe em nenhuma aba.

## O que está diferente (corrigir, se o design aprovar)

### Tela Escolha

| Item | Como está no app | Como o design pede |
|---|---|---|
| Cartão de informações | No fluxo da tela → **corta embaixo** | Flutuante (12 pt das bordas), raio 38 |
| Linha do nome | "Ali" minúsculo numa linha, chip e classe na linha de baixo | "ALI" + chip de pronome + classe, **tudo numa linha** |
| Chip de pronome | Amarelo-escuro maiúsculo | Cinza claro (#F1F5FA), texto minúsculo #3D4560 |
| Título | Tudo em peso 700 | "ESCOLHA" leve + "SEU IRISE" forte |
| Contador (3/9) | Fonte de texto, cinza escuro | Oswald 15, #8E96AE |
| Palco | 341 pt, busto colado na base | 368 pt, busto a 28 pt da base |
| Brilho | Menor (miolo ~190) | Miolo ~290 |
| Setas | Brancas sólidas | De vidro, traço 2.4 |
| Vizinhos cinzas | Opacidade .45 e um filtro que **não funciona no iPhone** (fica colorido) | Opacidade .5, cinza por sobreposição (funciona nos dois) |
| Sombras | Sem sombra no círculo do avatar e no botão | Círculo: lilás suave; botão: turquesa .35 |
| Atributos | Rótulo minúsculo, barrinhas arredondadas | Rótulo MAIÚSCULO, segmentos de canto 2 |
| Miniaturas | Espaço 4, anel por fora | Espaço 8, anel por dentro (ver dúvida 3) |

### Início (detalhes pequenos)

| Item | Como está | Como o design pede |
|---|---|---|
| Sombra do balão | Sem | 0 10 18 lilás .14 |
| Sombra do avatar no card | Sem | 0 14 22 preta .35 |
| Pontinhos do balão | Trocam seco | Transição de 0,3 s |
| Faixa: espaçamento do "ALI · SEMPRE ON-LINE" | 1.2 | 1.4 |
| Espaço cabeçalho→balão | ~26 pt | ~9 pt |

## As 5 dúvidas (cada uma tem uma imagem com o mesmo nome)

1. **duvida-1-cartao.png** — O cartão corta embaixo. Para flutuar como pedido, a proposta é o **busto diminuir de 250 para ~205**. Pode? (A alternativa da spec — subir tudo para o topo 60 — bate no X de fechar e no relógio do iPhone.)
2. **duvida-2-anel.png** — Anel do avatar: a rodada passada pediu **girando** (40 s/volta); a referência nova mostra **parado**. Qual vale?
3. **duvida-3-miniaturas.png** — Miniaturas: **espaço 4 com anel por fora** (rodada passada) ou **espaço 8 com anel por dentro** (pacote novo)? As duas cabem na tela.
4. **duvida-4-arraste.png** — Arrastar o carrossel: **segue o dedo** (como está, mais "de jogo") ou **um puxão passa um** (spec, mais simples)?
5. **duvida-5-falas.png** — Dois textos da spec batem com regras do produto: "**+3 gomos**" (o app dá no máximo 4 gomos por semana — prometer +3 seria mentira na maioria das vezes) e "**James Bar**" (o irise nunca inventa nome de lugar; sugere lugares reais do banco). Proposta: manter os textos honestos de hoje.

## Prints do estado atual (mock fiel ao código, 390×844)

print-escolha.png · print-inicio.png · print-inicio-rolada.png · print-chat.png

O corte do "Usar Ali" no print da Escolha é o comportamento real do código, não defeito do mock.
