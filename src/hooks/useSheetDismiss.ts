import { PanResponder } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Arrastar a alça pra baixo fecha a folha (13/10/2026, achado pelo Leandro: a alça já parecia
 * arrastável — é a mesma bolinha de sempre — mas soltar o dedo não fazia nada; só tocar no fundo
 * escuro atrás fechava). Só a alça carrega o gesto, não a folha inteira: assim o toque em botão,
 * chip ou campo de texto dentro da folha continua funcionando normal.
 *
 * PanResponder (sistema de toque clássico do RN) em vez de Gesture.Pan do gesture-handler
 * (13/10/2026, 2ª tentativa): o Modal nativo abre numa hierarquia própria, e mesmo com
 * GestureHandlerRootView envolvendo o conteúdo do Modal o arrasto não reagiu no aparelho do
 * Leandro. PanResponder não depende de nenhuma raiz nativa própria — é o mesmo sistema que o
 * Pressable do fundo já usa dentro do Modal sem problema nenhum — e ainda atualiza o shared
 * value do Reanimated direto (sem worklet: os callbacks do PanResponder já rodam na JS thread),
 * então a folha continua animando pelo mesmo `useAnimatedStyle` de sempre.
 *
 * Sem useRef/useMemo para guardar a instância: PanResponder.create é barato, e recriar a cada
 * render evita closure de ref (o lint de regras dos hooks barra ler `.current` durante o render,
 * mesmo dentro de um inicializador preguiçoso) e mantém `onClose` sempre o mais recente.
 */
export function useSheetDismiss(onClose: () => void) {
  const y = useSharedValue(0);
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) y.set(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 60 || g.vy > 0.6) onClose();
      y.set(withTiming(0, { duration: 200 }));
    },
    onPanResponderTerminate: () => {
      y.set(withTiming(0, { duration: 200 }));
    },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return { panHandlers: panResponder.panHandlers, style };
}
