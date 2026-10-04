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

## 2. Irise — assistente de descoberta em chat

Sem personagem, só um botão redondo com brilho em arco-íris no canto da Home. Três camadas, nesta
ordem — a IA é sempre o último recurso:

1. **Chips e um roteador de palavras-chave no aparelho** (`src/lib/iriseRouter.ts`), sem gastar
   IA. Resolve a maioria: "perto", "balada", "café", "barato", "surpreenda" etc.
2. **Só quando o texto livre não casa com nada**, a Edge Function `irise-intent` manda pro Groq ou
   Gemini (variável `IRISE_PROVIDER`, padrão `groq`) e volta **só a intenção estruturada**
   (categorias de lugar, se é pra descobrir lugar sem nota) — nunca um lugar, nunca nome, nota ou
   endereço. O prompt proíbe explicitamente "seguro"/"tranquila" e exige linguagem neutra
   (bem-vinde, identificade), nunca binária.
3. **Quem busca de verdade é o banco**: a RPC `irise_suggest_places` (migration 50) ou o
   `places_near` que a aba Lugares já usa. O resultado é renderizado com o **mesmo `PlaceCard`**
   de sempre — a Irise não tem como inventar nota, selo ou endereço porque nunca lê nem escreve
   esses campos, só escolhe o filtro.

Se a IA cair ou a chave não estiver configurada, o chat continua funcionando pelos chips — só o
texto livre fica sem resposta inteligente (mensagem avisando e os botões voltam).

- **Componente**: `src/components/irise/Irise.tsx` (botão + folha de chat).
- **Hooks**: `src/hooks/useIrise.ts` (busca no banco) e `src/lib/iriseRouter.ts` (camada 1).
- **Edge Function**: `supabase/functions/irise-intent/index.ts`.
- **Nenhum build novo precisa aqui também**: é só UI + `supabase.functions.invoke`, sem
  nenhuma peça nativa nova.

## O que eu preciso que você me traga

1. **Uma chave do Groq** (recomendado: tem plano grátis generoso e é rápido) —
   crie em console.groq.com → API Keys, e me diga a chave (ou cole direto em
   Supabase → Edge Functions → Secrets → `GROQ_API_KEY`, que eu não preciso nem ver).
   Sem essa chave, a camada 2 fica fora do ar e o chat funciona só com os chips — não quebra nada,
   mas não entende texto livre fora do roteador.
2. **(Opcional) Uma chave do Gemini**, se quiser poder trocar de provedor depois — crie em
   aistudio.google.com e grave como secret `GEMINI_API_KEY`. Pra usar, muda o secret
   `IRISE_PROVIDER` para `gemini` (sem precisar mexer em código).
3. **Revisar o banco de frases das pílulas** antes de ligar o push (migration 49) — são 11 frases,
   duas novas. Se quiser trocar/adicionar, me fala ou edita direto na tabela `comfort_pills` pelo
   SQL Editor.
4. **Decidir o intervalo do push** (padrão 4 dias) — mudo rápido se quiser outro número.
5. Depois de aprovar, só colar as migrations 49 e 50 (ou deixar subir sozinho, se a branch for
   mesclada numa das duas branches principais, que têm o pipeline automático) e publicar as duas
   Edge Functions novas (`comfort-pill-push` e `irise-intent`).

## Validado nesta sessão

- `supabase/migrations/00000000000049` e `...050` passaram no `scripts/db-smoke.sh` (stack
  Postgres 16 + PostGIS + pg_cron local), junto com todas as migrations existentes.
- Testado à mão: `next_comfort_pill` sorteia sem repetir e reinicia o ciclo quando esgota o banco.
- `npm run lint`, `npm run typecheck` e `npx expo export --platform ios` passaram sem erro com o
  código novo (Irise + Pílulas) integrado à Home e ao Perfil.
- Não testado em aparelho real (sem Mac/iPhone nesta sessão) — vale uma passada no
  `npx expo start --dev-client` antes de liberar pros testadores.
