# Runbooks — Irisa

Os 5 processos que hoje só funcionam porque o Alysson sabe fazê-los (bus factor 1, apontado na
análise de ponta a ponta de 15/10/2026). Este arquivo é pra quem mais entrar no projeto conseguir
tocar isso sem precisar vasculhar o histórico de sessões. Detalhe fino de cada assunto continua em
CLAUDE.md (contexto geral), PUBLICAR-IOS.md, SOLTAR-OUTUBRO.md, SUBIR-0.1.2.md, supabase/README.md,
docs/fotos.md — este arquivo é o índice de "o que rodar" quando precisar.

## 1. Build de loja (iOS/Android)

**Só pelo script, nunca `eas-cli build` colado cru:**

```bash
bash scripts/buildar.sh ios
bash scripts/buildar.sh android
```

O script para sozinho se: a branch não é `claude/laughing-keller-my8t7c`, tem mudança local não
commitada, o `git pull` falha, ou falta `.easignore`. Mostra a versão que vai no build e pede
confirmação antes de gastar cota do EAS (free tier, limite mensal).

Antes de rodar, confira à mão:
- A versão em `package.json`/`app.config.ts` é **maior** que a publicada nas lojas (Apple recusa
  build em versão já publicada).
- Mudou algo nativo (lib nova, ícone, permissão, `app.config.ts`)? Só nesse caso vale gastar build —
  mudança de JS/tela é update (seção 2).

iOS usa `--auto-submit` (vai direto pro App Store Connect); falta sempre criar a versão lá, escolher
a build e mandar pra revisão à mão (Alysson). Android sobe como AAB; falta enviar manualmente na
Play Console.

## 2. EAS Update (correção de JS sem gastar build)

```bash
bash scripts/publicar.sh "Mensagem do update"
```

Mesmas travas do build (branch, sem mudança local, pull limpo). Publica no canal `production`.
**Só alcança quem tem a mesma versão do app instalada** (`runtimeVersion` = `appVersion` em
`app.config.ts`) — update feito com `app.config` em 0.1.3 não chega em quem ainda está na 0.1.2.

Mudança nativa (nova dependência com código nativo, `app.config.ts`, ícone, permissão) **nunca** sai
por update — precisa de build nova (seção 1).

## 3. Moderação

- **Fotos de lugar e de quem avalia:** fila em `app/moderacao.tsx`, lida por `fotos_para_moderar()` e
  decidida por `moderar_foto(id, aprovar)` — ação só de quem tem `is_moderator()`. O robô
  `photo-check` (Edge Function, pg_cron de 5 em 5 min) passa a imagem pelo Cloud Vision antes: só
  aprova sozinho se as três notas do SafeSearch vierem `VERY_UNLIKELY`; qualquer dúvida cai na fila
  humana. **Sem `VISION_API_KEY` configurada, nada é aprovado sozinho** — toda foto espera moderação.
- **Denúncia** (relato, avaliação, mensagem do mural, foto): mesmo fluxo de `report_target`, mesma
  tela de moderação.
- **Bloqueio por usuário:** quem usa o app bloqueia direto (Perfil → Pessoas bloqueadas), não passa
  pela moderação.
- Quem modera hoje: só o Alysson e o Leandro (`is_moderator()`). Recrutar 3-5 pessoas de confiança da
  comunidade como moderadoras voluntárias é a saída de médio prazo apontada na análise (reduz o
  "moderação não escala").
- Painel web (`docs/admin/`, https://appirisa.com.br/admin/) cobre a mesma fila mais Pessoas, Lugares
  e Personagens do irise, com RPCs `admin_*` — login com e-mail/senha ou Google.

## 4. Segredos (onde cada chave mora)

Nenhuma chave de produção fica no repositório. Hoje cada uma vive numa máquina ou serviço diferente —
é o "segredos vivem numa máquina" apontado na análise. Resumo de onde procurar:

| Segredo | Onde mora | Pra que serve |
|---|---|---|
| `sb_secret_...` (service role) | `.env.scripts` no Mac do Alysson (fora do git) | Scripts de import, fotos |
| `SUPABASE_DB_URL` | GitHub → Settings → Secrets (Actions) | CI aplica migration sozinho no push |
| `GOOGLE_MAPS_API_KEY` | GitHub Secrets + `.env.scripts` | Fotos do Google (cota travada) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Supabase Edge Function secrets | SMTP transacional (boas-vindas, etc.) |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Supabase Edge Function secrets | Revogação Sign in with Apple |
| `VISION_API_KEY` (opcional) | Supabase Edge Function secrets | SafeSearch nas fotos |
| `TESTER_WELCOME_SECRET`, `photo_check_secret`, `push_secret` | Supabase Vault | Autoriza as Edge Functions chamadas pelo pg_cron |
| `META_IG_USER_ID` / token do Instagram | GitHub Secrets | Publicação automática de post |
| `SUPABASE_PUBLISHABLE_KEY` | GitHub → Actions → Variables (não é secret, é pública) | Build do site/painel |
| `R2_*`, `MAPILLARY_TOKEN` | `.env.scripts` no Mac | Fotos próprias via Mapillary/Cloudflare |

A saída de médio prazo que a análise recomenda: um cofre compartilhado (ex. Bitwarden) em vez de só
na máquina do Alysson — ainda não feito, fica pro roadmap de estrutura jurídica/financeira.

## 5. Restauração de banco

Supabase faz backup automático do projeto (frequência e retenção dependem do plano — conferir em
**Supabase Dashboard → Database → Backups** antes de precisar, não durante um incidente). Pontos
importantes específicos deste projeto:

- **Migrations nunca se recria com restore**: elas sobem sozinhas no push (`supabase/aplicar-migrations.sh`
  via CI) e ficam registradas em `irisa_ops.migrations`. Depois de um restore, confira se essa tabela
  bate com `supabase/migrations/` — um restore pra um ponto anterior pode "esquecer" migration que já
  tinha sido aplicada, e o CI tentaria aplicar de novo (ela é feita pra ser idempotente por tabela,
  mas vale checar à mão).
- **Nunca restaurar por cima do projeto de produção sem avisar o Alysson antes** — é o tipo de ação
  que este runbook existe pra evitar fazer no susto. Ação destrutiva/irreversível: sempre confirmar
  com ele antes.
- Teste local antes de qualquer mudança arriscada de schema: `scripts/db-smoke.sh` sobe um Postgres
  descartável, aplica todas as migrations + seed e roda `supabase/dev/smoke.sql`. Rodar isso elimina
  a maior causa de precisar restaurar (migration que quebra em produção).
- Dado apagado por engano (não é corrupção de schema, é ação de usuário/admin): como a maioria das
  tabelas tem só `on delete set null`/cascade intencional e sem soft-delete geral, recuperar uma linha
  específica normalmente exige restore pontual (point-in-time, se o plano cobrir) pra uma base
  paralela e copiar só a linha — não um restore do projeto inteiro.
