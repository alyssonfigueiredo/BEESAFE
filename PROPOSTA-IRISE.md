# Proposta: Irise, assistente de descoberta dentro do Irisa

Status: **proposta para aprovação, nada implementado**. Branch `feature/irise-assistente`.

Baseado em levantamento real do código atual (rotas, Home, Mapa, banco, avaliações, gamificação,
localização, componentes, Edge Functions). Não existe hoje nenhuma integração de IA no repo — é
greenfield total nesse eixo.

---

## 1. Onde o Irise entra na experiência atual

Ponto de encaixe: um cartão discreto na Home (`app/(tabs)/index.tsx`), entre o cartão escuro
principal (os dois botões Avaliar/Registrar) e o `GamiHomeCards`. Não vira 6ª aba, não vira botão no
header ao lado do `EmergencyButton` (emergência tem que continuar sendo o item mais visível e sem
ambiguidade na tela).

A UI de chat abre como **bottom sheet full**, reaproveitando `src/components/gami/Sheet.tsx` (o
mesmo padrão de `RewardSheet`/`WeekSheet`/`CoresSheet`): modal transparente, fundo escurecido,
folha branca com alça, fecha tocando fora. Isso evita criar um componente de modal novo e mantém a
mesma sensação de "folha que abre", que já é vocabulário visual do app.

Cartão de entrada na Home (visual = `Chip`/cartão tonal, ícone Irise):

```
✨ Tá procurando o quê hoje?
Irise pode te dar umas ideias.
```

## 2. Fluxo completo de UX

1. Toque no cartão → abre `IriseSheet` com saudação fixa (template, zero IA):
   `"E aí, qual vai ser hoje? 🌈"` + 4 chips grandes: **Quero um lugar**, **Quero irisar**,
   **Me surpreende**, **O que tem por perto?** + campo de texto livre abaixo
   (`"Ou me conta o que você tá procurando…"`).
2. Qualquer chip dispara **árvore de decisão local** (sem rede, sem IA) — telas sucessivas dentro da
   mesma sheet, cada etapa é um conjunto de chips (intenção → categoria → vibe → preço), terminando
   numa consulta real ao banco (`search_places`/`places_near`/`welcoming_ranking`, com filtros
   adicionais client-side por categoria/vibe quando o banco não tiver a coluna).
3. Texto livre → passa pelo **router** (seção 5): se o router já resolve (ex. "balada perto de mim"),
   nem toca em LLM. Se não resolve com confiança, vai pro Groq só para extrair intenção estruturada
   (JSON), nunca pra gerar a resposta final com fatos.
4. Resultado: 2–3 `PlaceCard` com uma frase de justificativa curta por card (gerada por template a
   partir de dados reais — ver seção 15), nunca um bloco de texto corrido.
5. Rodapé fixo: **"Quer procurar outra coisa?"** → reinicia a árvore (novo contexto, não acumula
   histórico). Sem "continuar conversando" infinito.
6. Lugar com `badge = "poucas"` ou `rating_count < 5` → Irise oferece contribuição
   (`"👀 Desse eu ainda sei pouco... Já foi? Conta pra gente."`) → toque em "Já fui" ==
   `router.push("/lugar/[id]?avaliar=1")`, abrindo o **formulário de avaliação existente**, sem
   nenhuma tela nova de avaliação.

## 3. Wireflow textual

```
Home
 └─ [cartão Irise] ──tap──> IriseSheet (estado: intro)
      ├─ chip "Quero um lugar" ──> estado: intencao
      │    ├─ "Date" ──> estado: vibe_date (Romântico/Casual/Barato/Impressionar/Tranquilo/Surpreenda)
      │    ├─ "Fervo" / "Comer" / "Beber" / "Café" / "Passear" / "Outra coisa" ──> filtros equivalentes
      │    └─ (cada folha final) ──> query determinística (search_places/places_near/welcoming_ranking
      │         + filtro local por categoria/vibe) ──> estado: resultados
      ├─ chip "Quero irisar" ──> estado: resultados, mas priorizando lugares com rating_count<5
      │    (mesma fonte de "quem precisa de avaliação" que hoje alimenta discovery_slate)
      ├─ chip "Me surpreende" ──> algoritmo local: sorteia 1 de welcoming_ranking/places_near
      │    respeitando regras de discovery_slate (não repetir visto/avaliado/recusado) ──> resultados
      ├─ chip "O que tem por perto?" ──> places_near(userLocation) direto ──> resultados
      ├─ texto livre ──> Router
      │    ├─ resolve sem IA (ex. "balada", "perto de mim", "barato") ──> resultados
      │    └─ não resolve ──> Groq (intent JSON) ──> resultados (camada 2)
      └─ estado: resultados
           ├─ card tocado ──> push /lugar/[id] (ficha de sempre)
           ├─ refinamento ("mais barato", "gostei do 2º mas...") ──> camada 3 (contexto mínimo:
           │    intenção estruturada + ids mostrados + última mensagem) ──> novos resultados
           ├─ "já fui" num card com poucas avaliações ──> push /lugar/[id]?avaliar=1
           └─ "Quer procurar outra coisa?" ──> volta a estado: intro, contexto descartado
```

## 4. Arquitetura técnica

- **Client (Expo/RN)**: `src/components/irise/IriseSheet.tsx` (reaproveita `Sheet.tsx`),
  `src/hooks/useIrise.ts` (máquina de estados local: intro → intencao → vibe → resultados;
  nenhuma chamada de rede nos passos guiados além das queries normais de `usePlaces`),
  `src/lib/iriseRouter.ts` (router determinístico, roda 100% no cliente, síncrono).
- **Backend de IA**: nova Edge Function `supabase/functions/irise-chat/index.ts`, seguindo o mesmo
  padrão de `apple-token`/`photo-check` (`Deno.serve`, CORS, `userFromRequest(req)` obrigatório,
  chave do provider em `Deno.env.get("GROQ_API_KEY")`/secret do Supabase, nunca no app). Só é
  chamada quando o router do cliente não resolveu.
- **Abstração de provider**: `supabase/functions/_shared/ai/AIProvider.ts` (interface
  `interpret(text, context): Promise<StructuredIntent>` e `phrase(kind, data): Promise<string>`),
  com `GroqProvider.ts` e `GeminiProvider.ts` implementando a interface. Edge Function escolhe o
  provider por env var (`AI_PROVIDER=groq`), trocar de modelo não toca em código de negócio.
- **Dados reais**: toda busca de lugar continua pelas RPCs existentes (`search_places`,
  `places_near`, `welcoming_ranking`, `places_similar`, `city_top_places`). A Edge Function nunca
  inventa lugar — ela só traduz texto em filtros, que o client (ou a própria function, com
  `adminClient()`) usa para consultar o banco de verdade.
- **Tabela nova mínima**: `irise_events` (analytics, ver seção 18) e, opcionalmente,
  `irise_sessions` só se quisermos persistir o contexto de refinamento entre telas da sheet — mas
  dá pra começar guardando o contexto **só em memória do client** (estado do `useIrise`), sem
  tabela nenhuma, já que a sessão de descoberta é curta e local por design (seção "NÃO QUERO CHAT
  INFINITO").

## 5. Router de intenções

Roda no cliente, antes de qualquer rede. Lista de regras (ordem = prioridade), cada regra é um
regex/keyword-match simples sobre o texto normalizado (minúsculo, sem acento):

```ts
type RouterResult =
  | { kind: "near" }                          // "perto de mim", "aqui perto"
  | { kind: "category"; cat: PlaceCategory }   // "balada" -> balada, "restaurante" -> restaurante
  | { kind: "price"; tier: "barato" }          // "barato", "em conta"
  | { kind: "sort_distance" }                  // "mais perto", "mais próximo"
  | { kind: "next" }                           // "outro", "mostra outro"
  | { kind: "already_been"; placeId: string }  // "já fui" (contexto: último card tocado)
  | { kind: "back" }                           // "voltar"
  | { kind: "surprise" }                       // "me surpreende"
  | { kind: "guided_date" }                    // "date", "encontro"
  | { kind: "unresolved"; text: string };      // cai pro Groq
```

Cada regra resolvida vira uma chamada de hook existente (`useNearPlaces`, filtro local por
`category`, `useWelcoming`, navegação). Só `unresolved` chama a Edge Function. Isso cobre
exatamente a lista de exemplos do pedido original (perto de mim, balada, restaurante, barato, mais
perto, outro, já fui, voltar, me surpreende, date).

## 6. Ações com ZERO IA

- Todos os 4 chips iniciais e suas árvores (intenção → categoria → vibe → preço).
- Qualquer frase que o router reconheça (lista da seção 5).
- "Me surpreende" resolvido pelo algoritmo local (welcoming_ranking + regras de não-repetição de
  `discovery_slate`).
- Mensagens de boas-vindas, biblioteca de respostas fora de escopo (seção 17).
- Oferta de avaliação para lugar com poucas avaliações (lógica = `rating_count < 5`, já existe).
- Navegação ("voltar", abrir ficha, fechar sheet).
- Fallback quando LLM está fora (seção 14).

## 7. Ações que usam Groq

- Texto livre não resolvido pelo router → `interpret()`: transforma frase em JSON estruturado
  (intent/occasion/categories/alcohol/vibe/price/distance). Prompt pequeno, few-shot curto,
  **Structured Output/JSON mode** do Groq (modelos Llama no Groq suportam JSON mode).
- Refinamento em linguagem natural depois dos resultados ("gostei do 2º mas mais barato") — camada 3,
  contexto mínimo (ids mostrados + intenção anterior + última frase).
- Opcional: gerar a frase de abertura de cada rodada de resultados na persona do Irise
  (`"Peguei a vibe. Separei esses pra você:"`) — mas isso também pode ficar 100% em template com
  variações sorteadas localmente, sem gastar chamada nenhuma. Recomendo começar só com template e
  medir se falta "vida" antes de gastar tokens nisso.

## 8. Ações que poderiam usar Gemini

Tudo assíncrono, fora do caminho de uma conversa:

- Classificar comentários de avaliação por "vibe" (romântico/família/fervo/tranquilo) em lote,
  noturno, para enriquecer filtros de vibe sem exigir nova pergunta no formulário de avaliação.
- Gerar/validar a frase de justificativa de recomendação em lote para lugares populares (cache,
  seção 13), em vez de gerar na hora.
- Qualquer enriquecimento multimodal futuro (ex. classificar foto enviada por categoria de ambiente).

Nenhuma dessas é necessária para o MVP do Irise — ficam como fase 2.

## 9. Integração futura com TybyrIA

Fora do escopo de recomendação. Pontos de contato: quando o Irise processar texto livre do usuário
(camada 2/3), esse texto passa pela mesma moderação que já existe para relatos/avaliações antes de
qualquer efeito (hoje não há moderação de texto livre, porque não há texto livre dirigido à IA).
TybyrIA entraria como **sinalizador** — nunca decide: marca mensagens hostis para revisão humana, do
mesmo jeito que `photo-check` sinaliza foto incerta pra fila humana, sem nunca banir/excluir
sozinha. Não implementar agora; documentar o gancho (`irise_events` guarda o texto bruto só se
sinalizado, para revisão, com TTL curto).

## 10. Estrutura dos prompts

**System prompt (interpret)** — fixo, curto, nunca muda por sessão:

```
Você traduz pedidos de lugar para LGBTQIA+ no Brasil em filtros estruturados.
Responda SOMENTE com JSON no schema dado. Nunca invente nome de lugar, endereço,
nota ou característica. Se não entender, devolva intent="unclear".
```

**User message**: só a frase da pessoa + (se houver) a lista curta de categorias/vibes válidas no
schema, para o modelo não inventar enum fora da lista. Nenhum dado de outros usuários, nenhuma
coordenada exata (ver seção 16).

**Refinamento (camada 3)**: mesmo system prompt + mensagem com `{intent_anterior, ids_mostrados,
nova_frase}` — nunca o histórico completo da sheet.

**Persona (phrase, opcional)**: prompt separado e pequeno, só quando quisermos gerar a frasezinha
de abertura; schema de saída é string curta (≤ 140 caracteres), com instrução de tom (debochada,
acolhedora, sem infantilizar, sem clichê de estereótipo).

## 11. Formato dos Structured Outputs

```json
{
  "intent": "find_place",
  "occasion": "date" | "friends" | "solo" | "group" | null,
  "categories": ["bar", "restaurante", "balada", "cafe", "hotel", "servico", "praca", "outro"],
  "alcohol": true | false | null,
  "vibe": ["quiet", "casual", "lively", "romantic", "cheap", "impress"],
  "price": "low" | "mid" | "high" | null,
  "distance": "near" | "any" | null,
  "confidence": 0.0
}
```

`categories` restrito ao enum `place_category` do banco — nunca texto livre. Se `confidence < 0.5`
ou `intent == "unclear"`, cai na resposta de fallback template (seção 17), sem 2ª chamada.

## 12. Estratégia de contexto

- Nenhuma mensagem anterior é reenviada por padrão — cada rodada da árvore guiada é stateless no
  servidor (o estado vive no client, em `useIrise`).
- Camada 2 (interpret): só a frase atual.
- Camada 3 (refinamento): intenção estruturada anterior (JSON pequeno) + ids dos lugares mostrados
  (não os dados completos, o client já tem os dados) + a nova frase. Nunca reenviar texto de
  mensagens antigas.
- Limite de refinamentos por sessão de descoberta: 3 (depois disso, Irise sugere reiniciar —
  `"Vamos do zero? Me conta de novo o que você quer."`), evita loop caro e sessão eterna.
- Fechar a sheet ou trocar de "estado: intro" descarta o contexto — próxima abertura é sessão nova.

## 13. Estratégia de cache

- **Cache de interpretação**: normalizar a frase (minúsculo, sem acento, trim) e cachear o JSON
  resultante por frase normalizada (tabela simples `irise_intent_cache(texto_normalizado pk, intent
  jsonb, created_at)`, TTL ~30 dias, ou até um `LRU` em memória da Edge Function se o volume não
  justificar banco). Muita gente escreve frases parecidas ("quero um lugar tranquilo pra date").
- **Cache de frase de persona**: por `(kind, place_id, badge)` — ex. a frase "ainda sei pouco desse
  lugar" é a mesma para qualquer lugar com `badge='poucas'`, não precisa gerar por lugar.
- Cache nunca guarda fatos variáveis (nota, contagem) — só o texto de interpretação/persona, que é
  reaproveitável porque não depende do estado atual do banco.

## 14. Estratégia de fallback

Se Groq/Gemini: timeout, erro, rate limit, sem cota → Edge Function devolve erro tipado
`{error: "ai_unavailable"}`. Client reage com:

```
"Meu sexto sentido deu uma cochilada 😭
Mas ainda consigo procurar do jeito clássico."
```

e cai automaticamente na árvore guiada (mostra os 4 chips iniciais de novo, sem sumir a sheet). A
busca determinística (`search_places`/`places_near`/`welcoming_ranking`) nunca depende do LLM, então
o Irise nunca fica "mudo" — na pior hipótese, vira só os botões.

## 15. Proteção contra hallucination

- O LLM **nunca** recebe permissão de gerar texto que vá direto pra tela como fato sobre um lugar.
  Toda frase de card (seção de recomendação) é **template preenchido com dados reais do banco**:

  ```
  templates.mais_tranquilo   -> "Mais tranquilo e bom pra conversar."       (score_affection alto, crowd baixo)
  templates.custo_baixo      -> "Boa se a ideia for ficar horas sem gastar." (categoria + price_level se existir)
  templates.poucas_avaliacoes-> "Esse combina com o que você pediu, mas a comunidade ainda falou pouco dele."
  ```

  Escolha do template é lógica local (comparar campos de `place_scores`), não geração livre.
- Se decidirmos usar LLM pra "temperar" a frase (camada opcional da seção 7), o output é restrito a
  reescrever o **template já escolhido**, nunca a inventar o critério — e passa por um
  schema/validador que rejeita presença de números, "R$", "nota", nomes de bairro fora dos dados
  enviados.
- Resposta final de "find_place" no client sempre renderiza os `PlaceCard`s a partir do objeto que
  veio das RPCs (nunca de texto livre do modelo) — o LLM só decide **quais filtros** usar na query,
  nunca o que aparece no card.

## 16. Segurança e privacidade

- Edge Function exige `userFromRequest(req)` (sessão autenticada) — mesmo padrão das outras
  functions. Nenhuma chamada anônima ao provider.
- **Nunca enviar ao provider**: coordenadas exatas do usuário, `user_id`/e-mail, nome de outros
  usuários, texto de relatos (occurrences são anônimos por design), conteúdo de avaliações de
  terceiros, tokens/push tokens, qualquer coisa de `profiles` alem do necessário (gênero gramatical
  pode ir, pois já é público-interno ao app).
- Localização: a busca geográfica acontece **sempre no backend/RPC** (`places_near` já recebe
  lat/lng e devolve candidatos com distância); o LLM só vê, quando precisar, um rótulo textual
  ("perto de você", bairro) — nunca a coordenada numérica.
- `irise_events`/cache de intent não armazena texto livre por padrão além do necessário pro cache
  (texto normalizado, sem PII); se formos guardar a frase bruta para depuração, TTL curto e sem
  vínculo a `user_id` seria o ideal — a decidir com você antes de implementar.

## 17. Biblioteca inicial de respostas prontas (zero IA)

```
boas_vindas:        "E aí, qual vai ser hoje? 🌈"
fora_de_escopo:      "Essa eu vou ficar te devendo. Agora, se for pra escolher onde ir…"
desabafo_generico:   "Amore, eu sou ótimo com rolê. Terapia ainda não liberaram pra mim 😭\nQuer que eu ache um lugar pra espairecer?"
pedido_tarefa:       "Meu expediente é irisar a cidade, bebê."
date_romantico:      "Tá apaixonade? Meus pêsames. 💅\nMas tenho umas ideias."
fervo:               "Ah. Finalmente uma pergunta séria."
sozinho:             "Sozinho sim. Sem rolê, jamais."
poucas_avaliacoes:   "👀 Desse eu ainda sei pouco.\nA comunidade quase não irisou por aqui."
convite_avaliar:     "Já foi? Conta pra gente."
ia_indisponivel:      "Meu sexto sentido deu uma cochilada 😭\nMas ainda consigo procurar do jeito clássico."
limite_refinamento:  "Vamos do zero? Me conta de novo o que você quer."
sem_resultado:       "Hmm, não achei nada que bata direitinho. Quer tentar outra vibe?"
```

Tudo respeita `useForma()`/`flexWord` já existente (flexão de gênero), igual ao resto do app.

## 18. Eventos de analytics

Tabela `irise_events`, no mesmo molde de `discovery_events` (migration 43): RPC de log
`security definer`, ignora silenciosamente sem sessão, sem policy de leitura ao usuário comum.

```sql
irise_events(
  id bigint identity, user_id uuid, created_at timestamptz,
  event text check in (
    'opened', 'guided_step', 'free_text_sent', 'router_resolved',
    'groq_called', 'gemini_called', 'ai_fallback', 'result_shown',
    'result_clicked', 'rate_started_from_irise', 'refinement_sent',
    'session_limit_hit', 'closed'
  ),
  resolved_by text check in ('guided','router','groq','gemini','fallback'),
  tokens_in int, tokens_out int, cache_hit boolean,
  place_id uuid, session_id uuid
)
```

Dá pra responder direto as perguntas do pedido: % resolvido sem IA = `count(resolved_by='guided' or
'router') / count(opened)`; conversão em clique/avaliação = join com `result_clicked`/
`rate_started_from_irise` por `session_id`.

## 19. Estimativa de chamadas/tokens por 1.000 usuários ativos/dia

Premissas conservadoras baseadas no desenho acima (chips cobrem a maior parte do uso, texto livre é
minoria, refinamento é raro):

| | por 1.000 usuários ativos/dia |
|---|---|
| Aberturas do Irise | ~250 (25% abrem o cartão) |
| Resolvidas 100% guiado/router (zero IA) | ~70% → ~175 sessões |
| Texto livre → Groq (interpret) | ~30% → ~75 chamadas, prompt curto (~150–250 tokens in, ~80–150 out) |
| Refinamento (camada 3) | ~20% dessas → ~15 chamadas extras |
| Cache hit em texto livre repetido | estimo 20–30% depois das primeiras semanas |
| Gemini (fase 2, lote noturno) | 0 chamadas síncronas por usuário — custo fixo de batch, não escala com DAU |

Total Groq/dia por 1.000 DAU: **~70–90 chamadas**, ~15–25k tokens de entrada, ~8–15k de saída —
ordem de grandeza de centavos de dólar/dia no tier do Groq, não dezenas de dólares. O ponto central
da arquitetura (router antes de IA) é justamente manter essa conta baixa mesmo em escala.

## 20. Comportamento em 1k / 5k / 10k / 50k usuários ativos/dia

- **1k DAU**: números da tabela acima. Cabe tranquilamente no tier gratuito/baixo do Groq.
- **5k DAU**: ~350–450 chamadas/dia. Ainda trivial; cache de intent começa a compensar mais (frases
  repetidas crescem mais que linear).
- **10k DAU**: ~700–900 chamadas/dia. Ponto de atenção: rate limit por usuário/sessão (seção
  "limite de refinamentos") evita que um usuário pesado monopolize cota. Monitorar `tokens_in/out`
  de `irise_events` pra decidir se vale subir tier do Groq.
- **50k DAU**: ~3.500–4.500 chamadas/dia. Aqui cache de intent e o router precisam estar bem
  afinados (medir quais frases mais caem em `unresolved` e promover regras novas pro router —
  é o mecanismo natural de "aprender" sem re-treinar nada). Também é o ponto em que considerar
  Gemini para pré-classificar lotes de frases recorrentes offline e alimentar o router com mais
  regras passa a valer a pena.

Em nenhuma escala a arquitetura depende de reenviar histórico ou manter sessão longa — o custo
cresce linear com DAU, não com tempo de uso por sessão, que é o risco real de custo em assistentes
conversacionais.

## 21. Componentes e estruturas atuais reutilizados

- `src/components/gami/Sheet.tsx` — modal/bottom sheet do Irise.
- `src/components/Chip.tsx`, `src/components/Button.tsx`, `src/components/StatCard.tsx` — UI dos
  chips, botões e métricas (se expormos algo no painel admin).
- `src/components/map/...` nada direto, mas `places_near`/`PlaceCard` reaproveitados do Mapa/Lugares.
- `src/hooks/usePlaces.ts` (search_places, useNearPlaces, useWelcoming, useSimilarPlaces) — fonte de
  dados de todo resultado do Irise.
- `src/hooks/useGamification.ts` (`convitesDaCidade`, `my_rated_places`) — pra não sugerir lugar já
  avaliado, mesma regra que `discovery_slate` já usa.
- `src/providers/CityProvider.tsx` — cidade e localização.
- `src/theme/domain.ts`/`tokens.js` — cores, AXES, categorias, vocabulário.
- `src/hooks/useGamification.ts`/`useForma` — flexão de gênero nas falas do Irise.
- Padrão de Edge Function (`_shared/supabase.ts`) e de RPC `security definer` + log silencioso
  (`discovery_log`) — moldes para `irise-chat` e `irise_events`.
- Formulário de avaliação em `app/lugar/[id].tsx` — **reaproveitado sem alteração**, só navegado via
  `?avaliar=1`, exatamente como a descoberta na Home já faz hoje.

## 22. Mudanças de banco necessárias

Nenhuma mudança em `place_ratings`, `place_scores`, `AXES`, pesos ou cálculo bayesiano. Novo, tudo
aditivo:

- `irise_events` (seção 18) + RPC `irise_log(event, place_id, resolved_by, tokens_in, tokens_out,
  cache_hit, session_id)`.
- `irise_intent_cache` opcional (seção 13) — ou cache em memória da function, decidir ao implementar.
- Nenhuma RPC existente muda de assinatura; o Irise só **chama** `search_places`, `places_near`,
  `welcoming_ranking`, `places_similar`, `city_top_places`, `my_rated_places` como já são.
- Se quisermos marcar origem da avaliação (`review_source='irise'`), é uma coluna nova opcional em
  `place_ratings` (nullable, default null) só para analytics — **não entra em cálculo de nota nem
  em policy**, e só se você aprovar explicitamente (ver item 23).

## 23. Confirmação explícita sobre o framework de avaliações

**O framework atual de avaliações não é alterado.** Nenhuma tabela nova de review, nenhuma nova
pergunta, nenhum novo peso, nenhuma nova escala. O Irise é só uma porta de entrada que termina
sempre no mesmo `app/lugar/[id].tsx` com os mesmos 4 eixos (`AXES`), a mesma mutação
(`useRatePlace`), o mesmo cálculo (`compute_place_score`). O único campo opcional que cogito (coluna
`review_source` em `place_ratings`, só para saber quantas avaliações nasceram no Irise) depende da
sua aprovação explícita antes de entrar — por padrão a proposta assume que nem isso entra na
primeira fase, e os eventos de `irise_events` (seção 18, `rate_started_from_irise`) já bastam pra
medir conversão sem tocar na tabela de avaliação.

---

## Riscos / onde determinístico vence IA

- **"Me surpreende" e ordenação por distância/preço**: sempre lógica local. IA aqui só adicionaria
  latência e custo sem ganhar precisão — o próprio pedido já reconhece isso.
- **Extração de vibe/preço de frase curta e comum** ("balada barata perto"): o router cobre quase
  tudo; cair pro Groq nesses casos é desperdício — vale investir tempo construindo a lista de regras
  do router (seção 5) antes de "deixar a IA resolver", porque toda frase recorrente que cai em
  `unresolved` é uma regra que falta.
- **Qualquer fato sobre lugar (nota, selo, endereço, contagem de avaliação)**: nunca gerar por IA,
  sempre ler do banco — risco de alucinação é alto e o dano reputacional (dizer que um lugar é
  seguro/acolhedor sem base) é o pior cenário possível pro produto, igual à regra já existente de
  nunca mostrar "área segura" na ficha do bairro.
- **Persona/tom**: aqui IA ajudaria mais que lógica, mas o risco é custo recorrente por sessão sem
  necessidade — recomendo nascer 100% template (biblioteca da seção 17 + variações sorteadas) e só
  introduzir geração de frase por IA depois de medir se os usuários sentem falta de variedade.
- **Moderação de texto livre enviado ao Irise**: hoje nada modera isso. Antes de abrir campo de
  texto livre pro público, mesmo sem TybyrIA pronta, vale um filtro simples de palavras (igual regra
  de "nunca enviar PII ao provider") pra não vazar texto ofensivo direto pro log/LLM sem nenhuma
  camada no meio.

---

Aprovando a arquitetura, a implementação entra em etapas pequenas (sugestão de ordem, a confirmar
com você): (1) UI guiada por chips + router, zero IA, zero migration; (2) `irise_events` + RPC de
log; (3) Edge Function `irise-chat` com Groq só para `interpret()`; (4) oferta de avaliação a partir
de card com poucas avaliações; (5) refinamento em linguagem natural (camada 3); (6) fallback e
métricas no painel admin.
