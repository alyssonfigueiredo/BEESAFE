import type { ExpoConfig } from "expo/config";

// Sign in with Apple exige conta Apple Developer paga. Fica ligado só nos builds do EAS (APP_ENV definido em eas.json);
// no build local com Personal Team (npx expo run:ios) fica desligado.
const appleSignIn = process.env.APP_ENV === "preview" || process.env.APP_ENV === "production";

// Push no Android passa pelo Firebase (FCM). O google-services.json não vai para o repositório público:
// ele entra pela variável de arquivo GOOGLE_SERVICES_JSON do EAS (no Mac: GOOGLE_SERVICES_JSON=./google-services.json).
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

const config: ExpoConfig = {
  name: "Irisa",
  slug: "irisa",
  owner: "alyssondfa",
  scheme: "irisa",
  version: "0.1.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#FAF9F6",
  primaryColor: "#D98C8A", // coral com a saturação a 60 % (src/theme/tokens.js)
  ios: {
    bundleIdentifier: "br.com.irisa.ios", // iOS: o App ID do App Store Connect (6816761128). Android segue br.com.irisa.app.
    supportsTablet: false,
    usesAppleSignIn: appleSignIn,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "A Irisa usa sua localização para mostrar a cidade ao redor e marcar o ponto de um relato ou lugar.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "br.com.irisa.app",
    ...(googleServicesFile ? { googleServicesFile } : {}),
    adaptiveIcon: {
      backgroundColor: "#FAF9F6",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: "./assets/favicon.png", bundler: "metro" },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-web-browser",
    ...(appleSignIn ? ["expo-apple-authentication"] : ["./plugins/withoutAppleSignIn"]),
    "@maplibre/maplibre-react-native",
    [
      "expo-image-picker",
      {
        photosPermission:
          "A Irisa abre suas fotos para você escolher a imagem do lugar que está avaliando.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/android-icon-monochrome.png", color: "#D98C8A" },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "A Irisa usa sua localização para mostrar a cidade ao redor e marcar o ponto de um relato ou lugar.",
      },
    ],
    [
      "expo-splash-screen",
      // Só a cor do papel: o radar animado (src/components/Splash.tsx) é a abertura de verdade,
      // e uma logo estática antes dele parecia duas aberturas. A imagem é um PNG transparente:
      // sem `image` o plugin não gera o drawable `splashscreen_logo` que o tema do Android
      // referencia, e o gradle quebra em processReleaseResources.
      {
        backgroundColor: "#F5F4F1",
        image: "./assets/splash-transparente.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  // EAS Update: mudança de tela, texto ou lógica chega em quem já tem o app, sem build nova.
  // Só código nativo (lib nova, ícone, permissão) continua exigindo build — e a cota do plano
  // Free do EAS é de build, não de update. `runtimeVersion` pela policy `appVersion`: um update
  // só alcança quem está na mesma versão do app, então build velha nunca recebe código novo.
  updates: { url: "https://u.expo.dev/38a09fd2-63cc-4a90-912d-0f73022944ff" },
  runtimeVersion: { policy: "appVersion" },
  extra: {
    eas: { projectId: "38a09fd2-63cc-4a90-912d-0f73022944ff" },
  },
};

export default config;
