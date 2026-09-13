import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Irisa",
  slug: "irisa",
  owner: "alyssondfa",
  scheme: "irisa",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: "#0B132B",
  primaryColor: "#FF5A5F",
  ios: {
    bundleIdentifier: "br.com.irisa.app",
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "A Irisa usa sua localização para mostrar a cidade ao redor e marcar o ponto de um relato ou lugar.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "br.com.irisa.app",
    adaptiveIcon: {
      backgroundColor: "#0B132B",
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
    "expo-apple-authentication",
    "@maplibre/maplibre-react-native",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "A Irisa usa sua localização para mostrar a cidade ao redor e marcar o ponto de um relato ou lugar.",
      },
    ],
    [
      "expo-splash-screen",
      { backgroundColor: "#0B132B", image: "./assets/splash-icon.png", imageWidth: 160 },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: "38a09fd2-63cc-4a90-912d-0f73022944ff" },
  },
};

export default config;
