# O que soltar em outubro (uma build só)

Escrito em 28/09/2026. A cota de build Android do EAS vira em **01/10**, então tudo que precisa
de build espera e sai junto. O que não precisa de build pode ser feito antes — está separado
abaixo. Cada passo é um comando para colar; nada aqui pede conhecimento de programação.

> Enquanto estes passos não forem feitos, o app dos testadores continua exatamente como está hoje.

---

## Parte 1 — dá para fazer agora, sem gastar build

### 1.1 Migrations 23 e 24 (fotos)

No Terminal, na pasta BEESAFE:

```bash
git pull
pbcopy < supabase/migrations/00000000000023_foto_propria.sql
```

Cole no SQL Editor (https://supabase.com/dashboard/project/ntjirpqulrnieeglpiei/sql/new) e
clique em **Run**. Depois:

```bash
pbcopy < supabase/migrations/00000000000024_foto_do_usuario.sql
```

Cole e rode também.

### 1.2 Contas do Mapillary e do Cloudflare

Passo a passo completo em `docs/fotos.md`, seção "Foto própria".

**Cloudflare — conta própria da Irisa, criada em 28/09/2026 com appirisa@gmail.com.** Ficou
separada da conta do SOAPerando de propósito: a Irisa já tem identidade nesse e-mail (Play
Console, App Store, Supabase, Gmail dos convites), a cobrança não se mistura, os 10 GB grátis são
só dela, e se um dia o projeto virar ONG ou passar para outra pessoa, basta entregar o e-mail.

Logado como appirisa@gmail.com em https://dash.cloudflare.com:

1. **R2** no menu da esquerda → ativar (pede cartão; 10 GB e o tráfego de saída são gratuitos).
2. **Create bucket**, nome `irisa-fotos`, região automática.
3. No bucket → **Settings** → **Public access** → ligar a **Public Development URL** (`r2.dev`).
   Feito em 28/09/2026: `https://pub-70bc82c84169407ea7e964b1d73cbdc5.r2.dev` — é o `R2_PUBLIC_URL`.
4. **R2 → Manage API tokens → Create API token**: permissão **Object Read & Write**. Copie o
   `Access Key ID` e o `Secret Access Key` — o secret só aparece uma vez.
5. O **Account ID** está na página inicial do R2, na coluna da direita.

**Mapillary** — https://www.mapillary.com → criar conta (use appirisa@gmail.com também, pelo mesmo
motivo) → Dashboard → Developers → Register application → copiar o token `MLY|...`. Grátis, sem
cartão.

Guarde tudo em `.env.scripts` (`open -e .env.scripts`):

```
MAPILLARY_TOKEN=MLY|...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=irisa-fotos
R2_PUBLIC_URL=https://...
```

### 1.3 Testar a cobertura antes de rodar tudo

```bash
cd ~/BEESAFE && set -a && source .env.scripts && set +a
node scripts/mapillary-photos.mjs 4106902 --limite 30 --simular
```

Não baixa nada, só conta quantos lugares de Curitiba teriam foto. Se a cobertura for boa:

```bash
node scripts/mapillary-photos.mjs --todas
```

As fotos ficam guardadas esperando a build — no app elas só aparecem depois.

### 1.4 Robô que olha a foto enviada pelos usuários

Google Cloud (mesmo projeto das outras chaves), https://console.cloud.google.com:

1. **APIs e serviços → Biblioteca** → ativar **Cloud Vision API**.
2. **Credenciais → Criar credencial → Chave de API**, restrição de API = só Cloud Vision.

No Terminal:

```bash
read -s -p "Chave da Cloud Vision: " V; echo
npx supabase secrets set VISION_API_KEY="$V" --project-ref ntjirpqulrnieeglpiei
```

(A chave do cron já está no Vault desde a migration 26; não tem mais `PHOTO_CHECK_SECRET`.)

A função `photo-check` e o agendamento já estão no ar (30/09/2026). Critério: só aprova sozinho
foto com as três notas (adulto, violência, sensual) em "muito improvável"; qualquer dúvida vai
para a tela de Moderação, e chega um e-mail em appirisa@gmail.com avisando.

Sem essa chave nada é aprovado sozinho: toda foto espera a fila humana. Não é erro, é o padrão
seguro.

---

### 1.5 Conferências na Supabase (cadastro, apelido e login com Apple)

Nada disso gasta build. Faça uma vez, antes de gerar a build.

1. **Apelido (migration 18).** No SQL Editor, rode:
   ```sql
   select count(*) from pg_proc where proname = 'ensure_my_profile';
   ```
   Se der `0`, cole e rode o arquivo inteiro:
   ```bash
   pbcopy < supabase/migrations/00000000000018_perfil_robusto.sql
   ```
   Se der `1`, já está aplicada.
2. **Login com Apple.** Authentication → Sign In / Providers → Apple → **Client IDs** com os dois:
   `br.com.irisa.ios,br.com.irisa.app`.
3. **Link do e-mail de confirmação.** Authentication → URL Configuration → **Redirect URLs** precisa
   ter `irisa://auth/callback` (o login com Google também depende dele).
4. **Limite de e-mail.** O SMTP próprio (Gmail da Irisa) já foi ligado em 29/09. Em Authentication →
   Rate Limits, deixe **60** e-mails por hora.

---

## Parte 2 — a build de outubro (a partir de 01/10)

```bash
git pull
npm install
```

Isso instala `expo-image-picker` (escolher a foto) e `expo-updates` (mandar correção sem build).

### 2.1 Testar no iPhone antes de gastar a cota Android

```bash
npx expo run:ios --device
```

Confira: ficha do lugar mostra foto do Mapillary; botão "Adicionar uma foto do lugar" dentro do
formulário de avaliação; tela Moderação mostra a fila de fotos com Liberar/Recusar.

E o que entrou do layout novo (feche o app de vez e abra de novo para ver a abertura inteira):

- **Abertura:** o radar pinta o anel, as cores enchem a tela e saem pela mesma varredura, sem
  travar e sem listras; não aparece logo parada antes.
- **Barra de abas** perto do rodapé, com o ícone saindo do cinza para a cor da aba.
- **Mapa** nítido; tocar num ponto abre o balão com o nome, tocar fora fecha; Mapa/Lista.
- **Perfil:** trocar o apelido e salvar mostra "Seu apelido agora é …"; no Apoio ele já vem preenchido.
- **Cadastro por e-mail:** o e-mail de confirmação chega; tocar no link no mesmo celular já entra.

### 2.2 APK de teste (não gasta a cota de produção)

```bash
npx eas-cli build -p android --profile preview
```

### 2.3 Build de produção Android

```bash
npx eas-cli build -p android --profile production
```

Envie na mesma faixa de teste fechado. **Nesta versão, mudar a resposta do IARC** sobre bloquear
ou ocultar outros usuários para **Sim** — o botão de bloquear entra agora.

### 2.4 iOS (App Store)

A primeira versão do iPhone já foi publicada (29/09/2026). Tudo o que entrou depois está na branch
principal, então **a próxima versão do iPhone sai com tudo junto**, do mesmo jeito que o Android:

```bash
git checkout claude/ecstatic-darwin-cmf7sw && git pull && npm install
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest
```

No App Store Connect (app 6816761128), crie a versão nova, escolha a build que chegou e envie para
análise. O número da build sobe sozinho (`autoIncrement`). Se a Apple pedir versão nova do app
(0.1.1, por exemplo), troque `version` em `app.config.ts` antes do build.

**Sobre foto enviada por usuário, a Apple é mais exigente que o Google.** A regra 1.2 (conteúdo
gerado por usuário) pede quatro coisas, e as quatro já existem: filtro do conteúdo antes de
publicar (toda foto passa pela aprovação da moderação; sem a chave do Cloud Vision não há robô),
denúncia, bloqueio de usuário e um contato de suporte (appirisa@gmail.com). Vale dizer isso nas
notas de revisão, em uma linha: *"Photos uploaded by users are reviewed by a human moderator before
they appear. The app has reporting, user blocking and account deletion."* Sem essa frase a revisão costuma
voltar com pedido de esclarecimento.

No iPhone dele, para testar sem gastar build: `npx expo run:ios --device` (precisa refazer a cada
7 dias, é limitação do Apple ID gratuito).

### 2.5 Depois desta build, correção de tela não precisa mais de build

```bash
npx eas-cli update --branch production --message "o que mudou"
```

Chega em quem já tem o app na próxima abertura, **nos dois sistemas de uma vez**: o mesmo update
vale para Android e iOS, desde que as duas builds tenham saído com o EAS Update ligado. Só mudança
de código nativo (lib nova, ícone, permissão) continua exigindo build.

Atenção ao iOS: a Apple permite update de conteúdo e correção, mas **não** mudar o propósito do
app por esse caminho. Recurso novo de verdade vai por build e revisão, como sempre.

---

## O que entra nesta build (Android e iOS)

- Bloqueio por usuário (migration 20, já no banco) — no Android, a resposta do IARC muda junto;
  no iOS, é o que atende a regra 1.2 da App Store.
- Foto do Mapillary aparecendo na ficha e nos cartões.
- Botão de enviar foto do lugar ao avaliar.
- Fila de moderação de imagem na tela Moderação.
- EAS Update ligado nos dois sistemas, para as próximas correções não custarem build.
- Layout novo (Liquid Glass, cores vivas, fundo aurora, Mapa em tela cheia com Mapa/Lista) e as
  animações (abertura do radar, ícones da barra, cinza que ganha cor, nota contando). O vidro
  (`expo-glass-effect`, `expo-blur`) e o fundo da abertura são nativos: só chegam com esta build.
- Apelido que salva de verdade (migration 18) e erros de login e cadastro em português.
- Link do e-mail de confirmação que abre o app e já entra na conta.

A cota do plano Free do EAS conta build de Android e de iOS no mesmo balde. Duas builds de
produção nesta rodada, uma de cada, e o resto do mês sai por update.
