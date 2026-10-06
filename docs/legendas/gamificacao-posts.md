# Primeira leva de posts sobre gamificação (05/10/2026)

Pedido do Leandro (10h43): revezar conteúdo "legal"/comunidade com segurança — mas a
gamificação (anel de 48 gomos, 8 níveis, 32 medalhas, compartilhar no story) não tinha
nenhuma peça na fila ainda, apesar de já estar no app (migrations 39, 40, 48). Entrou como
primeira leva, substituindo 4 peças "legal" já agendadas (conteúdo trocado, não cortado):

| Slot (data original) | Saiu (arquivado) | Entrou |
|---|---|---|
| 12/10 19h | reels-ombro | `carrossel-12.html` — gancho: "a Irisa ganhou um joguinho" |
| 13/10 19h | carrossel-9 (viajar em casal) | `carrossel-13.html` — catálogo de 6 medalhas (3D reais, via `docs/pingentes.js`) |
| 14/10 19h | reels-nota | `carrossel-15.html` — Sua evolução, 5 dos 8 níveis (ícones via `src/lib/niveis.ts`) |
| 16/10 19h | reels-olhar | `carrossel-14.html` — compartilhar medalha/nível no story (mockup do cartão) |

As 4 peças arquivadas (`arquivado: true` em `fila.json`) ficam guardadas, não apagadas —
dá para reaproveitar depois pelo botão "Reaproveitar" no artefato de aprovação.

**Fonte do visual:** os ícones das medalhas vieram de `window.PINGENTES.medal()` em
`docs/pingentes.js` (mesmo desenho do app); os ícones de nível foram copiados de
`ICONES` em `src/lib/niveis.ts` (não há versão web desse arquivo — colado manualmente,
os paths não mudam a menos que `niveis.ts` mude).

**O que ficou de fora, de propósito:** nenhum texto cita número de missões diárias, não
promete prêmio por streak (regra do produto: "semana acesa" sem culpa por dia perdido) e
nenhuma medalha "epica"/"lendária" aparece para não vazar a mais difícil antes da hora.

**Pendente:** o reequilíbrio segurança/legal mais amplo proposto antes (troca de datas
entre carrossel-7/reels-8 em 08–09/10, e carrossel-11/reels-3/4/5 em 17–20/10) ainda não
foi aplicado — só a inserção da gamificação. Falta decidir se aplica também.
