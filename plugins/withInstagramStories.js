const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

// Compartilhar conquista direto no story do Instagram (react-native-share, Social.InstagramStories).
// O sistema só deixa o app perguntar se o Instagram está instalado quando isso está declarado:
// no iOS, o esquema `instagram-stories` em LSApplicationQueriesSchemes; no Android 11+, o pacote do
// Instagram em <queries>. O plugin da própria biblioteca faz o mesmo, mas exige expo-build-properties.
module.exports = function withInstagramStories(config) {
  config = withInfoPlist(config, (cfg) => {
    const atual = Array.isArray(cfg.modResults.LSApplicationQueriesSchemes)
      ? cfg.modResults.LSApplicationQueriesSchemes
      : [];
    cfg.modResults.LSApplicationQueriesSchemes = [
      ...new Set([...atual, "instagram-stories", "instagram"]),
    ];
    return cfg;
  });
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults.manifest;
    m.queries = m.queries ?? [{}];
    const q = m.queries[0];
    q.package = q.package ?? [];
    if (!q.package.some((p) => p.$?.["android:name"] === "com.instagram.android")) {
      q.package.push({ $: { "android:name": "com.instagram.android" } });
    }
    return cfg;
  });
};
