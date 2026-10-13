# Banco de peças — funções novas do app (13/10/2026)

Pedido do Leandro: explorar as funções novas (0.1.2/0.1.3) em artes animadas sofisticadas.
A gamificação já tem a primeira leva na fila (carrossel-12/13/15/14, 12–16/10, ver
`gamificacao-posts.md`). Este banco cobre o que ainda não tem peça. A fila está cheia até
20/10: essas entram de 21/10 em diante, respeitando o xadrez (claro/escuro, estático/reels).

Formato preferido: **reels de 15–25 s** no pipeline existente (Web Animations presas a
`window.__setT` + `scripts/story-video.mjs`), gancho de reconhecimento em 1 s, texto grande
(maioria assiste sem som), app só no fecho, assinatura "cinza vira cor".

## 1. Reels "Quero ir" (favoritos) — prioridade

Gancho: "Aquele lugar que você guarda no print e nunca vai?" Cena: prints bagunçados em
cinza → o coração com traço arco-íris se desenha e enche → lista "Quero ir" organizada,
com selo e nível de atenção da região → avaliou, o lugar desliza pra "Já fui" com os seis
pontinhos de cor. Fecho: "Guarda na Irisa. Quando você for, conta pra gente quanta cor tinha."
Sinal pedido: salvar/compartilhar com quem sai junto.

## 2. Reels "Mural" (reações da casa + pergunta da semana)

Gancho: "Tem dia que a gente só precisa de um 'tô contigo'." Cena: mensagem anônima num
papel colado, as seis reações da casa pingando uma a uma (Te abraço, Arrasou, Tô contigo,
Sinto muito, Acendeu, Mais cor — cada uma com o desenho próprio), a pergunta da semana
abrindo. Fecho: "Sem nome. Sem perfil. Só a gente." Sinal: comentar respondendo a pergunta
da semana do post.

## 3. Reels "Suas cores" (o rastro que você deixa)

Gancho: "Sabe quem leu a sua avaliação?" Cena: a pessoa avalia (4 perguntas enchendo), o
lugar ganha cor no mapinha pessoal, e um contador sobe: "pessoas abriram a ficha depois da
sua avaliação" (sem número real inventado: usar "+1 +1 +1" subindo, não um total fictício).
Fecho: "Cada avaliação fica no mapa pra quem vem depois." Sinal: replay (loop do mapa colorindo).

## 4. Reels "Sua foto no mapa" (foto de quem avalia + moderação)

Gancho: "A foto do lugar, tirada por quem é da gente." Cena: foto cinza no azulejo da
categoria → alguém avalia e manda foto → selo "em revisão" → aprovada, a foto entra colorida
na ficha. Fecho honesto: "Nenhuma foto entra no ar sozinha." Reforça confiança sem prometer
"seguro".

## 5. Reels "Compartilhar conquista" (gera UGC)

Gancho: "Desbloqueei." Cena: medalha 3D flutuando no cartão de story (o mesmo desenho do
app, `assets/medalhas/*.png`), confete uma vez, o cartão vai pro story do Instagram. Fecho:
"Toda conquista cabe no seu story — sem nome de lugar, sem relato, só a cor." Convite: marcar
@appirisa ao postar. Obs.: essa peça ensina o fluxo que gera conteúdo de terceiros — soltar
DEPOIS que a 0.1.3 estiver aprovada nas duas lojas (o compartilhar precisa de build nova).

## 6. Story interativo — quiz das medalhas

1080×1920 com área tracejada pro adesivo de quiz: "Qual dessas medalhas existe de verdade
na Irisa?" (3 nomes reais + 1 inventado). Publicação manual (adesivo não sai pela API).

## Ordem sugerida

1 (Quero ir) → 2 (Mural) → 3 (Suas cores) → 6 (quiz, story de apoio na mesma semana) →
4 (foto) → 5 (conquista no story, só com a 0.1.3 aprovada).

Regras que valem pra todas: nada de "seguro/tranquilo"; relato nunca vira conteúdo de
gamificação; sem número de usuários; link só na bio; 5 hashtags.
