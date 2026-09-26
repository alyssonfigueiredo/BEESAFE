import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { glass } from "@/theme/tokens";

/**
 * Com cabeçalho e barra de abas em vidro, o conteúdo rola por baixo deles — então cada tela
 * precisa começar abaixo do cabeçalho e terminar acima da barra. Vai no `contentContainerStyle`
 * da ScrollView/FlatList, no lugar do `py-4` de antes.
 */
export function useScreenInsets({ tabs = true }: { tabs?: boolean } = {}) {
  const header = useHeaderHeight();
  const safe = useSafeAreaInsets();
  const bottomBar = tabs ? glass.tabBarHeight + glass.tabBarGap + safe.bottom : safe.bottom;
  return { paddingTop: header + 16, paddingBottom: bottomBar + 16 };
}
