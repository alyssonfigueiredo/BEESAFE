import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import { OCCURRENCE_TYPES, type OccurrenceType } from "@/theme/domain";
import { colors, fonts } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Tipos de relato à vista no mapa. */
  types: Set<OccurrenceType>;
  onToggleType: (t: OccurrenceType) => void;
  counts: Partial<Record<OccurrenceType, number>>;
};

/** "O que é cada coisa": a legenda do mapa e o filtro por tipo de relato. */
export function LegendSheet({ visible, onClose, types, onToggleType, counts }: Props) {
  const safe = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Fechar"
        style={{ flex: 1, backgroundColor: "rgba(20,24,41,0.4)" }}
      />
      <Animated.View
        entering={SlideInDown.duration(450)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "88%",
          backgroundColor: "#FBFCFE",
          borderTopLeftRadius: 34,
          borderTopRightRadius: 34,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: Math.max(safe.bottom, 16) + 18,
            gap: 14,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignSelf: "center",
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: "#D3DBE6",
            }}
          />
          <View className="flex-row items-start justify-between" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="font-display text-[28px] uppercase leading-tight text-ink">
                O que é cada coisa
              </Text>
              <Text className="mt-1 font-body text-sm text-muted">
                O lugar recebe cor. A rua recebe aviso.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <X color={colors.muted} size={22} />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <LegendTile
              icon={
                <Svg width={26} height={26} viewBox="0 0 40 40">
                  <Circle
                    cx={20}
                    cy={20}
                    r={16}
                    fill="#FFFFFF"
                    stroke={colors.turquoise}
                    strokeWidth={4}
                  />
                  <SvgText
                    x={20}
                    y={25}
                    textAnchor="middle"
                    fontFamily={fonts.display}
                    fontSize={13}
                    fill={colors.ink}
                  >
                    4,7
                  </SvgText>
                </Svg>
              }
              label="Lugar com nota"
            />
            <LegendTile
              icon={
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#8E93A5",
                    opacity: 0.8,
                    borderWidth: 1,
                    borderColor: "#FFFFFF",
                  }}
                />
              }
              label="Lugar ainda sem nota"
            />
            <LegendTile
              icon={
                <View
                  className="items-center justify-center"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 2,
                    borderColor: colors.lilac,
                    boxShadow: "0 2px 6px rgba(20,24,41,0.2)",
                  }}
                >
                  <Text className="font-display text-[11px] text-ink">24</Text>
                </View>
              }
              label="Vários lugares juntos: toque para abrir"
            />
            <LegendTile
              icon={
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "rgba(255,105,100,0.25)",
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: "rgba(199,40,37,0.5)",
                  }}
                />
              }
              label="Área com relato recente"
            />
          </View>

          <Text className="mt-1 font-body-bold text-xs uppercase tracking-[1.7px] text-dim">
            Tipos de relato
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
            {TYPE_KEYS.map((k) => {
              const on = types.has(k);
              const t = OCCURRENCE_TYPES[k];
              return (
                <Pressable
                  key={k}
                  onPress={() => onToggleType(k)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  className="flex-row items-center active:opacity-80"
                  style={{
                    height: 32,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    gap: 6,
                    backgroundColor: on ? `${t.color}40` : colors.subtle,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: on ? t.color : colors.border,
                    }}
                  />
                  <Text
                    className="font-body-medium text-[12.5px]"
                    style={{ color: on ? colors.ink : colors.dim }}
                  >
                    {t.label}
                  </Text>
                  <Text className="font-body text-[11.5px] text-dim">{counts[k] ?? 0}</Text>
                </Pressable>
              );
            })}
          </View>

          <Animated.Text
            entering={FadeIn.delay(200)}
            className="font-body text-[12.5px] leading-5 text-dim"
          >
            Sem relato não quer dizer área segura: quer dizer que ninguém registrou ainda.
          </Animated.Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function LegendTile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        width: "48.5%",
        gap: 10,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <View className="items-center justify-center" style={{ width: 26, height: 26 }}>
        {icon}
      </View>
      <Text className="flex-1 font-body text-[12.5px] text-muted">{label}</Text>
    </View>
  );
}
