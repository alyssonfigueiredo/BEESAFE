import { Plus } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { colors, shadow } from "@/theme/tokens";

import { CARD_GAP, CARD_W } from "./NearCards";

// As manchas da aurora bem de leve sobre o branco: a folha é da mesma família do fundo do app,
// mas precisa ser lida em cima do mapa.
const BLOBS = [
  { x: 0, y: 0, rx: 70, ry: 110, color: colors.turquoise, alpha: 0.11 },
  { x: 100, y: 0, rx: 60, ry: 100, color: colors.coral, alpha: 0.08 },
  { x: 100, y: 100, rx: 70, ry: 110, color: colors.lilac, alpha: 0.1 },
  { x: 0, y: 100, rx: 60, ry: 100, color: colors.yellow, alpha: 0.1 },
];

export function SheetAurora({ radius = 28 }: { radius?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: radius, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.96)" },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {BLOBS.map((b, i) => (
            <RadialGradient key={i} id={`ms${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={b.color} stopOpacity={b.alpha} />
              <Stop offset="0.62" stopColor={b.color} stopOpacity={b.alpha * 0.35} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {BLOBS.map((b, i) => (
          <Ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={`url(#ms${i})`} />
        ))}
      </Svg>
    </View>
  );
}

export type SheetCard = { key: string; node: ReactNode; width?: number };

type Props = {
  title: string;
  summary: ReactNode;
  cards: SheetCard[];
  /** Muda quando o conteúdo do carrossel muda (lugar tocado, grupo, área): reinicia a rolagem. */
  listKey: string;
  empty?: string;
  onRegistrar: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

const PAD = 20;

/** Folha "Perto de você" flutuando acima da barra de abas. */
export function NearSheet({ title, summary, cards, listKey, empty, onRegistrar, onLayout }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Animated.View
      entering={FadeInDown.duration(500)
        .delay(200)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 30 }] })}
      onLayout={onLayout}
      style={[
        {
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.85)",
          paddingTop: 10,
          paddingBottom: collapsed ? 14 : PAD,
        },
        shadow.lift,
      ]}
    >
      <SheetAurora radius={27} />
      <Pressable
        onPress={() => setCollapsed((c) => !c)}
        hitSlop={{ top: 10, bottom: 4, left: 60, right: 60 }}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Abrir a folha" : "Recolher a folha"}
        className="items-center"
        style={{ paddingBottom: 8 }}
      >
        <View
          style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(20,24,41,0.18)" }}
        />
      </Pressable>

      <View
        className="flex-row items-center justify-between"
        style={{ paddingHorizontal: PAD, gap: 10 }}
      >
        <Text className="min-w-0 flex-1 font-body-bold text-[17px] text-ink" numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onRegistrar}
          accessibilityRole="button"
          className="flex-row items-center rounded-full bg-coral active:opacity-80"
          style={[{ height: 34, paddingHorizontal: 14, gap: 6 }, shadow.coral]}
        >
          <Plus color={colors.night} size={14} strokeWidth={2.8} />
          <Text className="font-body-bold text-[13px] text-night">Registrar</Text>
        </Pressable>
      </View>

      {!collapsed && (
        <Animated.View entering={FadeIn.duration(250)}>
          <View style={{ paddingHorizontal: PAD, paddingTop: 2, paddingBottom: 12 }}>
            {summary}
          </View>
          {cards.length === 0 ? (
            !!empty && (
              <Text className="font-body text-sm text-dim" style={{ paddingHorizontal: PAD }}>
                {empty}
              </Text>
            )
          ) : (
            <ScrollView
              key={listKey}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={CARD_W + CARD_GAP}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: PAD, gap: CARD_GAP, paddingBottom: 2 }}
            >
              {cards.map((c, i) => (
                <Animated.View
                  key={c.key}
                  entering={FadeInRight.duration(380)
                    .delay(Math.min(i, 5) * 90)
                    .withInitialValues({ opacity: 0, transform: [{ translateX: 16 }] })}
                >
                  {c.node}
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
