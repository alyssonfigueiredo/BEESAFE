import { useEffect, useState } from "react";
import { Dimensions, type GestureResponderEvent } from "react-native";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const SCREEN_H = Dimensions.get("window").height;

/**
 * Arrastar a alça pra baixo fecha a folha (13/10/2026, achado pelo Leandro: a alça já parecia
 * arrastável — é a mesma bolinha de sempre — mas soltar o dedo não fazia nada; só tocar no fundo
 * escuro atrás fechava). Só a alça carrega o gesto, não a folha inteira: assim o toque em botão,
 * chip ou campo de texto dentro da folha continua funcionando normal.
 *
 * Eventos de TOQUE CRUS (`onTouchStart/Move/End`), sem sistema de responder nenhum — confirmado
 * funcionando em aparelho em 13/10/2026 depois de três tentativas que morriam todas na mesma
 * fase (a negociação de quem fica com o gesto: Gesture.Pan do gesture-handler, Gesture.Pan +
 * GestureHandlerRootView no Modal, PanResponder). onTouchStart/Move/End não negociam nada:
 * disparam pra qualquer View no caminho do toque, e o stream nativo continua entregando os moves
 * à view do touch-down mesmo com o dedo já fora dela. Não reivindicar responder também significa
 * não bloquear ninguém: toque curto na alça não faz nada e os botões da folha continuam intactos.
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
 * Saída suave (13/10/2026, pedido do Leandro: fechava "seco"): soltar passando do limiar não
 * chama `onClose` na hora — a folha TERMINA de sair da tela (desce o resto do caminho) e só
 * então fecha, continuando o movimento do dedo em vez de sumir no meio do arrasto. O componente
 * que chama este hook não desmonta ao fechar (só o `visible` do Modal muda), então o `y`
 * compartilhado sobrevive entre aberturas: por isso ele volta a 0 escondido, com atraso, depois
 * que a folha já sumiu — sem isso, a próxima abertura nasceria fora da tela.
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
      y0 = null;
      if (dy > 60) {
        y.set(
          withTiming(SCREEN_H, { duration: 220 }, (finished) => {
            if (finished) {
              runOnJS(latest.onClose)();
              // Some depois que o Modal já sumiu (o fade dele dura uns 300 ms) — resetar antes
              // traria a folha de volta à vista por um instante durante o fechamento.
              y.set(withDelay(400, withTiming(0, { duration: 0 })));
            }
          }),
        );
      } else {
        y.set(withTiming(0, { duration: 200 }));
      }
    };
    return {
      collapsable: false as const,
      onTouchStart: (e: GestureResponderEvent) => {
        y0 = e.nativeEvent.pageY;
      },
      onTouchMove: (e: GestureResponderEvent) => {
        if (y0 == null) return;
        const dy = e.nativeEvent.pageY - y0;
        if (dy > 0) y.set(dy);
      },
      onTouchEnd: (e: GestureResponderEvent) => {
        if (y0 != null) solta(e.nativeEvent.pageY - y0);
      },
      onTouchCancel: () => {
        if (y0 != null) solta(0);
      },
    };
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return { panHandlers, style };
}
