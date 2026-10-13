import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Arrastar a alça pra baixo fecha a folha (13/10/2026, achado pelo Leandro: a alça já parecia
 * arrastável — é a mesma bolinha de sempre — mas soltar o dedo não fazia nada; só tocar no fundo
 * escuro atrás fechava). Só a alça carrega o gesto, não a folha inteira: assim o toque em botão,
 * chip ou campo de texto dentro da folha continua funcionando normal.
 */
export function useSheetDismiss(onClose: () => void) {
  const y = useSharedValue(0);
  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) y.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 60 || e.velocityY > 600) {
        runOnJS(onClose)();
      }
      y.set(withTiming(0, { duration: 200 }));
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return { gesture, style };
}
