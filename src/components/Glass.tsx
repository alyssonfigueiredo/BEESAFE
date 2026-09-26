import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { glass } from "@/theme/tokens";

// Superfície de vidro para o que flutua sobre o conteúdo (cabeçalho, barra de abas, folhas).
// iOS 26+: Liquid Glass de verdade, com refração e brilho do sistema. Android e iOS antigo:
// blur com um véu branco e um fio de luz na borda — a mesma leitura, sem a refração.
// Conteúdo (cartões, botões, campos) continua opaco: vidro em cima de vidro vira névoa.

const LIQUID = Platform.OS === "ios" && isLiquidGlassAvailable();

type Props = ViewProps & {
  /** Véu sobre o blur. `strong` para folhas com texto longo. */
  tint?: "regular" | "strong";
};

export function Glass({ tint = "regular", style, children, ...rest }: Props) {
  const veil = tint === "strong" ? glass.tintStrong : glass.tint;
  const flat = StyleSheet.flatten(style) ?? {};
  const radius = {
    borderRadius: flat.borderRadius,
    borderTopLeftRadius: flat.borderTopLeftRadius,
    borderTopRightRadius: flat.borderTopRightRadius,
    borderBottomLeftRadius: flat.borderBottomLeftRadius,
    borderBottomRightRadius: flat.borderBottomRightRadius,
  };

  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={veil}
        colorScheme="light"
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[style, styles.clip]} {...rest}>
      <BlurView
        tint="light"
        intensity={70}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, radius, styles.veil, { backgroundColor: veil }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden", backgroundColor: "transparent" },
  veil: { borderWidth: StyleSheet.hairlineWidth, borderColor: glass.edge },
});
