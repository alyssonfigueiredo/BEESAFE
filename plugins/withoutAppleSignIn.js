const { withEntitlementsPlist } = require("expo/config-plugins");

// O pacote expo-apple-authentication adiciona o entitlement de Sign in with Apple no prebuild só por
// estar instalado, e `ios.usesAppleSignIn: false` não desfaz isso. Contas Apple gratuitas (Personal Team)
// não suportam essa capability, então o build local com `npx expo run:ios` falha na assinatura.
// Este plugin remove o entitlement; ele só entra quando APP_ENV não é de build do EAS.
module.exports = function withoutAppleSignIn(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["com.apple.developer.applesignin"];
    return cfg;
  });
};
