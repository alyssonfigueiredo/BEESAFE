# Irisa — a cidade vista por você

App nacional para a comunidade LGBTQIA+: relatos anônimos de LGBTIfobia, lugares avaliados com estrelas e mural de apoio.
Plano completo em [PLANO.md](./PLANO.md).

## Stack

Expo (React Native, TypeScript, Expo Router, NativeWind) + Supabase (Postgres/PostGIS, Auth, Realtime, RLS).

## Rodar

```bash
cp .env.example .env   # preencha URL e anon key do Supabase
npm install
npx expo start
```

Build de desenvolvimento no celular: `npx eas build --profile development --platform android` (exige conta no expo.dev).

## Checks

```bash
npm run check   # lint + typecheck
```
