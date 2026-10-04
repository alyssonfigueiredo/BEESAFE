# Irise + Pílulas de acolhimento — o que foi feito e o que falta

Branch: `feature/irise-ia-pilulas` (criada a partir de `claude/laughing-keller-my8t7c`, com os
commits 44–48 que ela já tinha). Nada foi mexido nas outras branches.

## 1. Pílulas de acolhimento

Gatilho de conforto **dentro do app** — não é post pro Instagram. A cada `pilula_intervalo_dias`
dias (padrão 4, em `app_settings`) sem receber uma, a pessoa ganha uma pílula por push; cada uma
é sorteada sem repetir até esgotar o banco de frases, então todo mundo recebe uma frase diferente
na mesma leva, não a mesma mensagem pra todo mundo. Também dá pra pedir uma a qualquer hora pelo
atalho em **Perfil → Pílula de acolhimento**.

- **Banco de frases**: `supabase/migrations/00000000000049_pilulas_de_acolhimento.sql`, tabela
  `comfort_pills`. Vieram as frases já aprovadas no guia da marca + duas novas, marcadas no
  comentário da migration — **reveja antes de ir ao ar** (dá pra editar a tabela pelo SQL Editor
  a qualquer momento, sem build).
- **Push**: Edge Function `comfort-pill-push`, chamada 1x por dia pelo pg_cron (13h UTC = 10h em
  Brasília). Usa o mesmo mecanismo do `send-push` que já existe, mas manda uma notificação
  individual por pessoa (frases diferentes), não um broadcast igual pra todo mundo.
- **Tela** (`app/pilulas.tsx`): mostra a última pílula recebida (a mesma do push, se foi por aí),
  botão "Quero outra pílula" e "Compartilhar".
- **Compartilhar**: reaproveita o `CompartilharSheet` que as medalhas já usam — mesmo fundo com as
  quatro manchas de cor, os brilhinhos, a assinatura `#radarmin` + Irisa no rodapé. A frase entra
  em arco-íris, do mesmo jeito que o nome da medalha. **Sem nenhum dado da pessoa**: nem apelido,
  nem lugar, nem conta.
- **Nenhum build novo precisa**: o compartilhamento já usa `react-native-view-shot`,
  `expo-sharing` e `react-native-share`, que já estavam no app pras medalhas. É tudo JS —
  sai por `npx eas-cli update --branch production` (pra quem já tem a 0.1.2).

## 2. Irise — um assistente só, por dentro orquestra dois modelos

Sem personagem, só um botão redondo com brilho em arco-íris no canto da Home. A pessoa nunca vê
"Groq", "Gemini" nem nome de modelo nenhum — pra ela é só "a Irise respondeu". Dois caminhos:

1. **Chips (botões prontos)**: zero IA, vão direto no banco (`irise_suggest_places`/`places_near`).
   "Quero um lugar", "Quero irisar", "O que tem por perto" etc. — determinístico, sem custo de IA.
2. **Texto livre**: vai inteiro pro **Irise Orchestrator** (`supabase/functions/irise-orchestrator`),
   que por dentro:
   - **Groq** lê o texto e decide: é pergunta sobre o app (responde direto) ou pedido de lugar
     (chama a ferramenta `buscar_lugares` com tool calling)?
   - Se for busca, a função consulta o banco de verdade (`irise_suggest_places`/`places_near`,
     até 12 candidatos reais).
   - **Gemini** ranqueia esses candidatos e explica o motivo de cada um — só com os campos que
     já existem (categoria, eixos, selo, bairro), nunca inventa nada.
   - **Groq de novo** escreve a frase final na voz da Irise, sabendo quantos lugares foram
     achados, sem repetir nome/nota (isso a tela mostra nos cartões).
   - O app recebe `{ message, places }` e mostra os cartões com o **mesmo `PlaceCard`** de sempre
     + o motivo do Gemini como legendinha.

Se a IA cair ou a chave não estiver configurada, o chat continua funcionando pelos chips — só o
texto livre fica sem resposta inteligente (mensagem avisando e os botões voltam).

- **Componente**: `src/components/irise/Irise.tsx` (botão + folha de chat).
- **Hooks**: `src/hooks/useIrise.ts`.
- **Edge Function**: `supabase/functions/irise-orchestrator/index.ts`.
- **Nenhum build novo precisa aqui**: é só UI + `supabase.functions.invoke`, sem peça nativa nova.

## 3. TybyrIA — moderação de discurso de ódio (projeto Código Não Binário)

Você pediu um terceiro cérebro pra "inteligência da comunidade" usando um modelo do Código Não
Binário. Pesquisei: a TybyrIA v2.2 (`Veronyka/tybyria-v2.2`, Hugging Face, pública, licença MIT)
**não é** um analisador de sentimento de avaliação — é um classificador de discurso de ódio
anti-LGBTQIA+ em português. Botei ela pra fazer o que ela realmente faz, e que serve direto ao
propósito do app: moderação.

- **O que faz**: a cada 10 min, a Edge Function `tybyria-check` pega avaliações e mensagens do
  mural que ainda não foram checadas, manda o texto pra TybyrIA e grava o score.
- **Nunca atrasa nem esconde sozinha**: a avaliação continua aparecendo na hora (sua decisão de
  04/10 não muda). Score ≥ 0,40 (limiar que o próprio modelo recomenda) só gera uma denúncia
  automática, que cai na **mesma fila de moderação que já existe** (`moderation_queue`) — revisão
  continua sendo humana, igual a uma denúncia de pessoa.
- **Migration**: `00000000000052_tybyria_moderacao.sql`. **Edge Function**:
  `supabase/functions/tybyria-check/index.ts`.
- **Nenhum build novo**: roda só no servidor.

## O que eu preciso que você me traga

Lembrete: nenhuma chave vai no chat — cola direto no painel do Supabase
(Project Settings → Edge Functions → Secrets). Eu confirmo se a função enxergou o secret, sem
precisar ver o valor.

1. **`GROQ_API_KEY`** (obrigatória pro texto livre) — console.groq.com → API Keys, plano grátis.
2. **`GEMINI_API_KEY`** (recomendada) — aistudio.google.com. Sem ela, os lugares ainda aparecem
   (na ordem que o banco já devolve), só sem o "motivo" por lugar.
3. **`HF_API_TOKEN`** (pra ligar a TybyrIA) — huggingface.co → Settings → Access Tokens, nível
   "Read" já serve, é grátis. Sem ela, a moderação automática de ódio fica desligada (nada quebra,
   só não roda).
4. **Revisar o banco de frases das pílulas** antes de ligar o push (migration 49) — 11 frases,
   duas novas marcadas no comentário da migration.
5. **Decidir o intervalo do push** das pílulas (padrão 4 dias) — mudo rápido se quiser outro número.
6. Depois de aprovar: colar as migrations 49–52 (ou deixar subir sozinho, se a branch for mesclada
   numa das branches principais) e publicar as três Edge Functions novas (`comfort-pill-push`,
   `irise-orchestrator`, `tybyria-check`).

## Validado nesta sessão

- As quatro migrations novas (49, 50, 51, 52) passaram no `scripts/db-smoke.sh` (Postgres 16 +
  PostGIS + pg_cron local), junto com todas as migrations existentes.
- Testado à mão: `next_comfort_pill` sorteia sem repetir e reinicia o ciclo quando esgota o banco.
- `npm run lint`, `npm run typecheck` e `npx expo export --platform ios` passaram sem erro com o
  código novo (Irise + Pílulas) integrado à Home e ao Perfil.
- **Não testado**: as chamadas reais ao Groq, Gemini e Hugging Face (preciso das chaves) e o app
  em aparelho físico (sem Mac/iPhone nesta sessão) — vale `npx expo start --dev-client` antes de
  liberar pros testadores.
