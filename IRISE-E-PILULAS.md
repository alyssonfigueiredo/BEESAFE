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

## 3. TybyrIA — pausada por ora

Você pediu um terceiro cérebro pra "inteligência da comunidade" usando um modelo do Código Não
Binário. Pesquisei: a TybyrIA v2.2 (`Veronyka/tybyria-v2.2`, Hugging Face, pública, licença MIT)
**não é** um analisador de sentimento de avaliação — é um classificador de discurso de ódio
anti-LGBTQIA+ em português. Tinha montado como moderação automática (score alto vira denúncia
na fila de sempre, revisão continua humana), mas por decisão sua (04/10/2026) ficou **de fora por
ora**: você quer seguir só com o que já está 100% confirmado como grátis, e o plano do Hugging
Face, mesmo sendo grátis de verdade (US$0,10 de crédito/mês, sem cobrança sem cartão cadastrado),
ainda não entrou nessa categoria pra você.

A migration 55 desfaz a 52 (tabela, funções e cron da TybyrIA) e a Edge Function foi removida.
Nada foi perdido: é só retomar com uma migration nova quando fizer sentido.

## O que eu preciso que você me traga

Lembrete: nenhuma chave vai no chat. Agora tem um lugar mais fácil que o dashboard do Supabase:
**appirisa.com.br/admin/ → Ajustes → Chaves de API** (logado como admin) — cola e salva, fica
criptografado no Vault, ninguém (nem o painel) consegue ler de volta, só sobrescrever. As Edge
Functions acham sozinhas. Se preferir, o caminho antigo (Project Settings → Edge Functions →
Secrets no Supabase) continua funcionando igual — tem prioridade se as duas estiverem preenchidas.

1. **`GROQ_API_KEY`** (obrigatória pro texto livre) — console.groq.com → API Keys, plano grátis.
2. **`GEMINI_API_KEY`** (recomendada) — aistudio.google.com. Sem ela, os lugares ainda aparecem
   (na ordem que o banco já devolve), só sem o "motivo" por lugar.
3. **Revisar o banco de frases das pílulas** antes de ligar o push (migration 49) — 11 frases,
   duas novas marcadas no comentário da migration.
4. **Decidir o intervalo do push** das pílulas (padrão 4 dias) — mudo rápido se quiser outro número.
5. Depois de aprovar: colar as migrations (ou deixar subir sozinho, se a branch for mesclada numa
   das branches principais) e publicar as Edge Functions novas (`comfort-pill-push`,
   `irise-orchestrator`).

## Validado nesta sessão

- As migrations novas passaram no `scripts/db-smoke.sh` (Postgres 16 + PostGIS + pg_cron local),
  junto com todas as migrations existentes.
- Testado à mão: `next_comfort_pill` sorteia sem repetir e reinicia o ciclo quando esgota o banco;
  `admin_set_api_key`/`admin_api_keys_status`/`get_secret_for_function` também testados à mão.
- `npm run lint`, `npm run typecheck` e `npx expo export --platform ios` passaram sem erro com o
  código novo (Irise + Pílulas) integrado à Home e ao Perfil.
- **Não testado**: as chamadas reais ao Groq e Gemini (preciso das chaves) e o app em aparelho
  físico (sem Mac/iPhone nesta sessão) — vale `npx expo start --dev-client` antes de liberar pros
  testadores.
