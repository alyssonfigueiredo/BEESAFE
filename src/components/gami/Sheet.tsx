import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeUp } from "@/components/gami/Anim";
import { useFolhaAberta } from "@/hooks/useDiscovery";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";

/**
 * Folha que sobe de baixo (o mesmo desenho da folha de recompensa: #FBFCFE, cantos de 34, alça).
 * Chega com calma: o fundo escurece e a folha sobe 12 px aparecendo (360 ms, ease-out), sem mola
 * e sem atravessar a tela. O conteúdo só monta com a folha aberta, então as animações de
 * preenchimento lá dentro recomeçam a cada abertura.
 *
 * Arrastar a alça pra fechar (13/10/2026, achado pelo Leandro: "Sua semana", "Suas cores", "Sua
 * evolução" e o detalhe de medalha usam esta folha, e nenhuma tinha gesto de arrastar — só as
 * outras 5 folhas do app tinham ganhado o `useSheetDismiss` até aqui). A alça carrega o gesto
 * numa View própria, fora do `FadeUp`: a animação de entrada e o arrasto são duas transformações
 * independentes, a de entrada só roda uma vez e o arrasto segue o dedo depois.
 */
export function Sheet({
  visible,
  onClose,
  children,
  contentStyle,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  useFolhaAberta(visible);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { panHandlers: dragHandlers, style: dragStyle } = useSheetDismiss(onClose);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,24,41,0.38)" }]}
        onPress={onClose}
        accessibilityLabel="Fechar"
      />
      {visible && (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: height * 0.88,
              backgroundColor: "#FBFCFE",
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
            },
            dragStyle,
          ]}
        >
          <View
            {...dragHandlers}
            style={{ paddingTop: 12, alignItems: "center" }}
            hitSlop={{ top: 10, bottom: 10, left: 60, right: 60 }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: "#D5DDE7",
                marginBottom: 14,
              }}
            />
          </View>
          <FadeUp duration={360} distance={12} style={{ flexShrink: 1 }}>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={[
                { paddingHorizontal: 22, paddingBottom: 34 + insets.bottom, gap: 14 },
                contentStyle,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </FadeUp>
        </Animated.View>
      )}
    </Modal>
  );
}
