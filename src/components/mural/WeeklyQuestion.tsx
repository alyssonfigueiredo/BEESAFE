import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import type { WeeklyQuestion as Question } from "@/hooks/useSupport";
import { colors } from "@/theme/tokens";

/**
 * Pergunta da semana: o painel edita, o recado que responde guarda o id. Mostra só QUANTAS
 * pessoas responderam — nunca quem (nada de inicial nem avatar).
 */
export function WeeklyQuestion({
  question,
  answers,
  onAnswer,
}: {
  question: Question;
  answers: number;
  onAnswer: () => void;
}) {
  // Svg com width/height em "100%" é instável (às vezes não preenche o cartão todo e deixa um
  // fundo branco aparecendo): mede o cartão e desenha o gradiente no tamanho exato em pixels.
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      className="overflow-hidden rounded-[26px] p-[18px]"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && size.h > 0 && (
        <Svg style={{ position: "absolute", top: 0, left: 0 }} width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="qweek" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.lilac} stopOpacity={0.24} />
              <Stop offset="1" stopColor={colors.turquoise} stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#qweek)" />
        </Svg>
      )}
      <Text className="font-body-bold text-[11.5px] uppercase tracking-[1.6px] text-lilacInk">
        Pergunta da semana
      </Text>
      <Text className="mt-1.5 font-display text-[24px] uppercase leading-[27px] text-ink">
        {question.texto}
      </Text>
      <View className="mt-3 flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 font-body text-[12.5px] text-muted">
          {answers > 0 ? (
            <>
              <Text className="font-body-bold text-ink">{answers}</Text>{" "}
              {answers === 1 ? "pessoa respondeu" : "pessoas responderam"}
            </>
          ) : (
            "Seja a primeira resposta"
          )}
        </Text>
        <Pressable
          onPress={onAnswer}
          className="h-[34px] items-center justify-center rounded-full bg-night px-4 active:opacity-80"
          accessibilityRole="button"
        >
          <Text className="font-body-bold text-[13px] text-white">Responder</Text>
        </Pressable>
      </View>
    </View>
  );
}
