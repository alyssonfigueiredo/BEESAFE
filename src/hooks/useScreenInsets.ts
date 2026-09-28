import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { glass } from "@/theme/tokens";

/**
 * Com cabeçalho e barra de abas em vidro, o conteúdo rola por baixo deles — então cada tela
 * precisa começar abaixo do cabeçalho e terminar acima da barra. Vai no `contentContainerStyle`
 * da ScrollView/FlatList, no lugar do `py-4` de antes.
 */
/**
 * Distância da barra de abas à borda de baixo. Em aparelho com indicador de início (área
 * segura de 34), a cápsula desce até quase encostar nele, como a barra do iOS 26; em aparelho
 * com botão físico, uma margem fixa.
 */
export function tabBarBottom(safeBottom: number) {
  return safeBottom > 0 ? Math.max(safeBottom - 14, 8) : 12;
}

export function useScreenInsets({ tabs = true }: { tabs?: boolean } = {}) {
  const header = useHeaderHeight();
  const safe = useSafeAreaInsets();
  const bottomBar = tabs ? glass.tabBarHeight + tabBarBottom(safe.bottom) : safe.bottom;
  return { paddingTop: header + 16, paddingBottom: bottomBar + 16 };
}
