import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { Glass } from "@/components/Glass";
import { useTypewriter } from "@/hooks/useTypewriter";
import { colors } from "@/theme/tokens";

/**
 * Caixa de diálogo de RPG (prévia do personagem do irise). Texto em máquina de escrever: um toque
 * durante a digitação completa o texto; com o texto completo, um toque chama `onAvancar`. Os
 * botões de ação só aparecem depois que o texto termina.
 */
export function CaixaDeFala({
  nome,
  texto,
  acoes,
  onAvancar,
  passos,
  passoAtual,
}: {
  nome?: string;
  texto: string;
  acoes?: { label: string; onPress: () => void }[];
  onAvancar?: () => void;
  passos?: number;
  passoAtual?: number;
}) {
  const { shown, done, skip } = useTypewriter(texto);
  const piscar = useSharedValue(1);
  useEffect(() => {
    if (!done) return;
    piscar.set(withRepeat(withTiming(0.25, { duration: 650 }), -1, true));
  }, [done, piscar]);
  const estiloSeta = useAnimatedStyle(() => ({ opacity: piscar.get() }));

  const tocar = () => {
    if (!done) skip();
    else onAvancar?.();
  };

  return (
    <Pressable onPress={tocar} disabled={!onAvancar && done}>
      <Glass tint="strong" style={{ borderRadius: 28, padding: 18 }}>
        <View>
          {!!nome && (
            <View
              className="mb-2 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: colors.yellow }}
            >
              <Text className="font-display text-[11px] uppercase tracking-[0.08em] text-ink">
                {nome}
              </Text>
            </View>
          )}
          <Text className="font-body-medium text-[15px] leading-[21px] text-ink">{shown}</Text>
          {done && acoes && acoes.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {acoes.map((a) => (
                <Pressable
                  key={a.label}
                  onPress={a.onPress}
                  className="rounded-full px-4 py-2.5 active:opacity-80"
                  style={{ backgroundColor: colors.ink }}
                >
                  <Text className="font-body-bold text-[13px] text-paper">{a.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View className="mt-2 flex-row items-center justify-between">
            {passos ? (
              <View className="flex-row gap-1.5">
                {Array.from({ length: passos }).map((_, i) => (
                  <View
                    key={i}
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ backgroundColor: i === passoAtual ? colors.ink : colors.border }}
                  />
                ))}
              </View>
            ) : (
              <View />
            )}
            {done && !(acoes && acoes.length > 0) && (
              <Animated.Text
                style={[estiloSeta, { color: colors.amber }]}
                className="font-display text-[13px]"
              >
                ▼
              </Animated.Text>
            )}
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}
