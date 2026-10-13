const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

// O iOS 27 fecha na abertura o app que ainda usa o ciclo antigo (só AppDelegate, sem UIScene):
// o crash cai em _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption, antes do JS.
// O modelo do Expo 57 ainda cria a janela no AppDelegate; aqui ela passa para um SceneDelegate.

const SCENE_DELEGATE = `import UIKit
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Link que abriu o app frio (ex.: irisa://auth/callback do e-mail de confirmação).
    var launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions = [.url: url]
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

const JANELA_NO_APPDELEGATE =
  /window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });

  config = withAppDelegate(config, (cfg) => {
    const { contents, language } = cfg.modResults;
    if (language !== "swift") throw new Error("withSceneLifecycle: AppDelegate em Swift esperado.");
    if (contents.includes("// janela criada no SceneDelegate")) return cfg;
    if (!JANELA_NO_APPDELEGATE.test(contents)) {
      throw new Error(
        "withSceneLifecycle: não achei a criação da janela no AppDelegate (o modelo do Expo mudou?).",
      );
    }
    cfg.modResults.contents = contents.replace(
      JANELA_NO_APPDELEGATE,
      "// janela criada no SceneDelegate (plugins/withSceneLifecycle.js)",
    );
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const nome = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const destino = path.join(cfg.modRequest.platformProjectRoot, nome, "SceneDelegate.swift");
      fs.writeFileSync(destino, SCENE_DELEGATE);
      return cfg;
    },
  ]);

  return withXcodeProject(config, (cfg) => {
    const nome = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const arquivo = `${nome}/SceneDelegate.swift`;
    if (!cfg.modResults.hasFile(arquivo)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: arquivo,
        groupName: nome,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
};
