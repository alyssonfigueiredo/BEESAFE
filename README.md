# Irisa — a cidade vista por você

App nacional para a comunidade LGBTQIA+: relatos anônimos de LGBTIfobia, lugares avaliados em quatro eixos de acolhimento e mural de apoio.
Plano completo em [PLANO.md](./PLANO.md).

## Stack

Expo (React Native, TypeScript, Expo Router, NativeWind) + Supabase (Postgres/PostGIS, Auth, Realtime, RLS).

## Rodar

```bash
cp .env.example .env   # URL do projeto e chave publishable (sb_publishable_...) do Supabase
npm install
```

O app usa MapLibre nativo, então não roda no Expo Go: precisa de um build nativo.

### iPhone (Xcode, Apple ID gratuito)

```bash
npx expo prebuild --platform ios --clean   # gera ios/
npx expo run:ios --device                  # compila e instala (escolha o aparelho)
npx expo start --dev-client                # Metro; `r` recarrega o app
```

No Xcode, em Signing & Capabilities, selecione seu Personal Team (o prebuild --clean zera essa escolha). O app instalado assim expira em 7 dias; rode `run:ios --device` de novo. Sign in with Apple só entra em builds EAS (`APP_ENV=preview|production`).

Build sem Metro nem botão de desenvolvimento: `npx expo run:ios --device --configuration Release`.

### Android (APK pela nuvem da Expo, plano free)

```bash
npx eas-cli login
npx eas-cli env:push preview --path .env
npx eas-cli build -p android --profile preview   # gera APK instalável por link/QR
```

Produção (AAB para a Play Store): `npx eas-cli build -p android --profile production`.

### Banco e dados

Migrations, seeds e imports geográficos: [supabase/README.md](./supabase/README.md).

## Documentação

- [PLANO.md](./PLANO.md): decisões, modelo de dados, regras, fases.
- [docs/lojas.md](./docs/lojas.md): ficha completa para Play Console e App Store.
- [docs/auth-social.md](./docs/auth-social.md): Google e Apple no Supabase.
- [docs/privacidade.md](./docs/privacidade.md) e [docs/termos.md](./docs/termos.md): publicados em https://alyssonfigueiredo.github.io/BEESAFE/ (workflow `pages.yml`, gerador `scripts/build-site.mjs`).
- Apresentação (pitch) e mockup: artifacts no claude.ai, links no PLANO.

## Checks

```bash
npm run check   # lint + typecheck
```
