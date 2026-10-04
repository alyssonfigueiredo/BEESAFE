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
import Animated, { Easing, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFolhaAberta } from "@/hooks/useDiscovery";

/**
 * Folha que sobe de baixo (o mesmo desenho da folha de recompensa: #FBFCFE, cantos de 34, alça).
 * Sobe deslizando, sem mola. O conteúdo só monta com a folha aberta, então as animações de
 * preenchimento lá dentro recomeçam a cada abertura.
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
  const reduce = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
          entering={reduce ? undefined : SlideInDown.duration(480).easing(Easing.out(Easing.cubic))}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: height * 0.88,
            backgroundColor: "#FBFCFE",
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            paddingTop: 12,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: "#D5DDE7",
              marginBottom: 14,
            }}
          />
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
        </Animated.View>
      )}
    </Modal>
  );
}
