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

Passo a passo completo em `docs/fotos.md`, seção "Foto própria". Resumo:

- **Mapillary** — https://www.mapillary.com → Dashboard → Developers → Register application →
  copiar o token `MLY|...`. Grátis, sem cartão.
- **Cloudflare R2** — https://dash.cloudflare.com → R2 → criar bucket `irisa-fotos` → Settings →
  Public access → ligar o domínio `r2.dev` → Manage API tokens → Object Read & Write.

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
SECRET=$(openssl rand -hex 24)
read -s -p "Chave da Cloud Vision: " V; echo
npx supabase secrets set PHOTO_CHECK_SECRET=$SECRET VISION_API_KEY="$V" --project-ref ntjirpqulrnieeglpiei
npx supabase functions deploy photo-check --project-ref ntjirpqulrnieeglpiei
echo "select vault.create_secret('$SECRET', 'photo_check_secret');" | pbcopy
```

Cole a última linha no SQL Editor e rode.

Sem essa chave nada é aprovado sozinho: toda foto espera a fila humana. Não é erro, é o padrão
seguro.

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

### 2.2 APK de teste (não gasta a cota de produção)

```bash
npx eas-cli build -p android --profile preview
```

### 2.3 Build de produção

```bash
npx eas-cli build -p android --profile production
```

Envie na mesma faixa de teste fechado. **Nesta versão, mudar a resposta do IARC** sobre bloquear
ou ocultar outros usuários para **Sim** — o botão de bloquear entra agora.

### 2.4 Depois desta build, correção de tela não precisa mais de build

```bash
npx eas-cli update --branch production --message "o que mudou"
```

Chega em quem já tem o app na próxima abertura. Só mudança de código nativo (lib nova, ícone,
permissão) continua exigindo build.

---

## O que entra nesta build

- Bloqueio por usuário (migration 20, já no banco) — e a resposta do IARC muda junto.
- Foto do Mapillary aparecendo na ficha e nos cartões.
- Botão de enviar foto do lugar ao avaliar.
- Fila de moderação de imagem na tela Moderação.
- EAS Update ligado, para as próximas correções não custarem build.
