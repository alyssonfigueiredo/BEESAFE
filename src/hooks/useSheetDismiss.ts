import { useEffect, useState } from "react";
import { PanResponder } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Arrastar a alça pra baixo fecha a folha (13/10/2026, achado pelo Leandro: a alça já parecia
 * arrastável — é a mesma bolinha de sempre — mas soltar o dedo não fazia nada; só tocar no fundo
 * escuro atrás fechava). Só a alça carrega o gesto, não a folha inteira: assim o toque em botão,
 * chip ou campo de texto dentro da folha continua funcionando normal.
 *
 * 3ª rodada (13/10/2026): o gesto reivindica o responder NO INÍCIO do toque
 * (`onStartShouldSetPanResponder: true`), não na negociação de movimento. No New Architecture
 * (Fabric, obrigatório no Expo 57) dentro de Modal, depender só de `onMoveShouldSetPanResponder`
 * era o que falhava no aparelho — e na folha de denúncia nem chegava a negociar: o Pressable do
 * fundo é PAI da folha e reivindicava o responder no toque inicial, ganhando do handle pra sempre.
 * Como a alça é o único dono do gesto e não tem nada clicável dentro, reivindicar no início não
 * custa nada (toque curto solta com dy<60 e nada acontece). `onPanResponderTerminationRequest:
 * false` impede que outro componente roube o gesto no meio do arrasto.
 *
 * Instância ESTÁVEL (useState com inicializador preguiçoso): recriar o PanResponder a cada render
 * troca os handlers no meio do gesto quando a folha re-renderiza durante o arrasto (chat da
 * Irise, animações da recompensa), e a instância nova nunca recebeu o grant — o arrasto morre em
 * silêncio. O onClose mais recente chega por ref atualizado em useEffect e lido só dentro dos
 * callbacks (o lint de hooks barra `.current` durante o render); `useSharedValue` devolve sempre
 * o mesmo objeto, então o closure do primeiro render continua válido.
 *
 * PanResponder (sistema de toque clássico do RN) em vez de Gesture.Pan do gesture-handler
 * (2ª tentativa): o Modal nativo abre numa hierarquia própria, e mesmo com GestureHandlerRootView
 * envolvendo o conteúdo do Modal o arrasto não reagiu. PanResponder atualiza o shared value do
 * Reanimated direto (callbacks já rodam na JS thread), então a folha anima pelo mesmo
 * `useAnimatedStyle` de sempre.
 */
export function useSheetDismiss(onClose: () => void) {
  const y = useSharedValue(0);
  // Caixa estável em vez de useRef: o lint de hooks barra passar ref pra função durante o render,
  // e o PanResponder.create roda no inicializador do useState (que é render).
  const [latest] = useState(() => ({ onClose }));
  useEffect(() => {
    // Padrão "latest box" de propósito: fora do render, só o gesto lê. O lint não distingue
    // esta caixa mutável deliberada de estado de verdade.
    // eslint-disable-next-line react-hooks/immutability
    latest.onClose = onClose;
  });
  const [panHandlers] = useState(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) y.set(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 60 || g.vy > 0.6) latest.onClose();
          y.set(withTiming(0, { duration: 200 }));
        },
        onPanResponderTerminate: () => {
          y.set(withTiming(0, { duration: 200 }));
        },
      }).panHandlers,
  );
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return { panHandlers, style };
}
