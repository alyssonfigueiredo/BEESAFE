import { useEffect, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Arrastar a alça pra baixo fecha a folha (13/10/2026, achado pelo Leandro: a alça já parecia
 * arrastável — é a mesma bolinha de sempre — mas soltar o dedo não fazia nada; só tocar no fundo
 * escuro atrás fechava). Só a alça carrega o gesto, não a folha inteira: assim o toque em botão,
 * chip ou campo de texto dentro da folha continua funcionando normal.
 *
 * 4ª rodada (13/10/2026, iOS): eventos de TOQUE CRUS (`onTouchStart/Move/End`), sem sistema de
 * responder nenhum. As três tentativas anteriores morreram todas na mesma fase — a NEGOCIAÇÃO de
 * quem fica com o gesto (Gesture.Pan do gesture-handler, Gesture.Pan + GestureHandlerRootView no
 * Modal, PanResponder negociando por movimento e depois reivindicando no início) — e nenhuma
 * reagiu no aparelho, o que aponta pra negociação em si falhando dentro do Modal nativo no Fabric.
 * onTouchStart/Move/End não negociam nada: disparam pra qualquer View no caminho do toque, e o
 * stream nativo continua entregando os moves à view do touch-down mesmo com o dedo já fora dela.
 * Não reivindicar responder também significa não bloquear ninguém: toque curto na alça não faz
 * nada e os botões da folha continuam intactos.
 *
 * `collapsable: false` viaja junto no spread: no Android, view transparente só com props de
 * layout é achatada da árvore nativa e deixaria de receber toque.
 *
 * Instância ESTÁVEL (useState preguiçoso) com o `y0` do gesto no closure: recriar handlers a cada
 * render perderia o ponto inicial no meio do arrasto quando a folha re-renderiza (chat da Irise,
 * animações da recompensa). O onClose mais recente chega pela caixa `latest`, lida só dentro dos
 * callbacks (o lint de hooks barra `.current`/mutação durante o render); `useSharedValue` devolve
 * sempre o mesmo objeto, então o closure do primeiro render continua válido.
 *
 * Logs temporários (13/10/2026): pra confirmar no Metro (`npx expo start --dev-client`) se o
 * toque sequer chega até aqui antes de tentar uma 5ª abordagem às cegas. Tirar depois de
 * confirmado — não é pra ir pra produção com isso ligado.
 */
export function useSheetDismiss(onClose: () => void) {
  const y = useSharedValue(0);
  // Caixa estável em vez de useRef: o lint de hooks barra passar ref pra função durante o render,
  // e os handlers nascem no inicializador do useState (que é render).
  const [latest] = useState(() => ({ onClose }));
  useEffect(() => {
    // Padrão "latest box" de propósito: fora do render, só o gesto lê. O lint não distingue
    // esta caixa mutável deliberada de estado de verdade.
    // eslint-disable-next-line react-hooks/immutability
    latest.onClose = onClose;
  });
  const [panHandlers] = useState(() => {
    let y0: number | null = null;
    const solta = (dy: number) => {
      console.log("[sheetDismiss] onTouchEnd/Cancel — dy final", dy);
      y0 = null;
      if (dy > 60) latest.onClose();
      y.set(withTiming(0, { duration: 200 }));
    };
    return {
      collapsable: false as const,
      onTouchStart: (e: GestureResponderEvent) => {
        y0 = e.nativeEvent.pageY;
        console.log("[sheetDismiss] onTouchStart", y0);
      },
      onTouchMove: (e: GestureResponderEvent) => {
        if (y0 == null) return;
        const dy = e.nativeEvent.pageY - y0;
        console.log("[sheetDismiss] onTouchMove", dy);
        if (dy > 0) y.set(dy);
      },
      onTouchEnd: (e: GestureResponderEvent) => {
        if (y0 != null) solta(e.nativeEvent.pageY - y0);
      },
      onTouchCancel: () => {
        console.log("[sheetDismiss] onTouchCancel — algo cancelou o toque no meio");
        if (y0 != null) solta(0);
      },
    };
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return { panHandlers, style };
}
