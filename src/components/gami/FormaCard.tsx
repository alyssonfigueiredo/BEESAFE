import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { EASE, FadeUp } from "@/components/gami/Anim";
import {
  flexWord,
  useForma,
  useGamification,
  useSetMedalForm,
  type Forma,
} from "@/hooks/useGamification";
import { colors, shadow } from "@/theme/tokens";

// "Como o app fala com você" (Perfil): a, o ou e vale para o app inteiro — boas-vindas, textos de
// apoio e nomes de medalha. A frase da marca ("onde a gente é bem-vinde") não muda.

const FORMAS: Forma[] = [0, 1, 2];

export function FormaCard() {
  const { data: g } = useGamification();
  const forma = useForma();
  const setForma = useSetMedalForm();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(forma);

  useEffect(() => {
    x.set(reduce ? forma : withTiming(forma, { duration: 400, easing: EASE }));
  }, [forma, reduce, x]);

  const pillW = w > 0 ? (w - 6) / 3 : 0;
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * pillW }] }));

  if (!g) return null;
  return (
    <View className="gap-3 rounded-[30px] bg-surface px-6 py-6" style={shadow.card}>
      <Text className="font-body-medium text-[17px] text-ink">Como o app fala com você</Text>
      <View
        className="flex-row rounded-[18px] bg-subtle"
        style={{ padding: 3 }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessibilityRole="radiogroup"
      >
        {pillW > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 3,
                bottom: 3,
                left: 3,
                width: pillW,
                borderRadius: 15,
                backgroundColor: colors.solid,
                boxShadow: "0 2px 8px rgba(20,24,41,0.12)",
              },
              pill,
            ]}
          />
        )}
        {FORMAS.map((f) => {
          const on = forma === f;
          return (
            <Pressable
              key={f}
              onPress={() => setForma.mutate(f)}
              className="h-9 flex-1 items-center justify-center rounded-[15px]"
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text
                className={
                  on ? "font-body-bold text-[14px] text-ink" : "font-body text-[14px] text-muted"
                }
              >
                {flexWord(f, "Bem-vind")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FadeUp key={forma} distance={0} duration={350}>
        <Text className="font-body text-[12.5px] leading-[18px] text-muted">
          No app inteiro: “{flexWord(forma, "Bem-vind")} à Irisa”, “como você foi{" "}
          {flexWord(forma, "recebid")}”, medalhas como{" "}
          <Text className="font-body-bold text-ink">{flexWord(forma, "Famosinh")}</Text>. A frase da
          marca, “onde a gente é bem-vinde”, fala de todo mundo e não muda.
        </Text>
      </FadeUp>
    </View>
  );
}
