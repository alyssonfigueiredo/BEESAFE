import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";

import { HeartIcon } from "@/components/FavHeart";
import { colors, shadow } from "@/theme/tokens";

import { formatCount } from "./mapData";

export type MapMode = "mapa" | "lista";

const EASE = Easing.out(Easing.cubic);

type Props = {
  mode: MapMode;
  onMode: (m: MapMode) => void;
  showPlaces: boolean;
  showRelatos: boolean;
  placeCount: number;
  relatoCount: number;
  onTogglePlaces: () => void;
  onToggleRelatos: () => void;
  onFilters: () => void;
  /** Camada Quero ir (migration 65): só os lugares salvos. Sem `queroCount`, o botão não aparece. */
  showQuero?: boolean;
  queroCount?: number | null;
  onToggleQuero?: () => void;
  /** Filtro de tipo de relato ligado: o botão de filtros ganha um ponto. */
  filtering?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/**
 * Painel sólido logo abaixo do cabeçalho: Mapa | Lista e as duas camadas. Sólido de propósito —
 * os chips de vidro flutuando sobre o mapa ficavam ilegíveis em cima das ruas.
 */
export function MapPanel({
  mode,
  onMode,
  showPlaces,
  showRelatos,
  placeCount,
  relatoCount,
  onTogglePlaces,
  onToggleRelatos,
  onFilters,
  filtering,
  onLayout,
  showQuero,
  queroCount,
  onToggleQuero,
}: Props) {
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          marginHorizontal: 14,
          padding: 8,
          gap: 8,
          borderRadius: 26,
          backgroundColor: "rgba(255,255,255,0.94)",
        },
        shadow.card,
      ]}
    >
      <Segmented mode={mode} onMode={onMode} />
      <View className="flex-row" style={{ gap: 6 }}>
        <LayerToggle
          label="Lugares"
          count={placeCount}
          on={showPlaces}
          color={colors.turquoise}
          ink={colors.turquoiseInk}
          onPress={onTogglePlaces}
        />
        <LayerToggle
          label="Relatos"
          count={relatoCount}
          on={showRelatos}
          color={colors.coral}
          ink={colors.coralInk}
          onPress={onToggleRelatos}
        />
        {queroCount != null && onToggleQuero && (
          <Pressable
            onPress={onToggleQuero}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!showQuero }}
            accessibilityLabel={`Quero ir, ${queroCount} ${queroCount === 1 ? "lugar" : "lugares"}: ${showQuero ? "ligado" : "desligado"}`}
            className="flex-row items-center justify-center active:opacity-80"
            style={{
              height: 38,
              paddingHorizontal: 10,
              gap: 5,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: showQuero ? "rgba(255,255,255,0)" : colors.subtle,
              backgroundColor: showQuero ? colors.night : "#FFFFFF",
            }}
          >
            <HeartIcon on size={17} />
            <Text
              className="font-body-bold text-[13px]"
              style={{ color: showQuero ? colors.paper : colors.muted }}
            >
              {queroCount}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onFilters}
          accessibilityRole="button"
          accessibilityLabel="Filtros e legenda"
          className="items-center justify-center active:opacity-70"
          style={{
            width: 44,
            height: 38,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            borderWidth: 1.5,
            borderColor: colors.subtle,
          }}
        >
          <SlidersHorizontal color={colors.ink} size={18} strokeWidth={2.2} />
          {filtering && (
            <View
              style={{
                position: "absolute",
                top: 6,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.coral,
              }}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Segmented({ mode, onMode }: { mode: MapMode; onMode: (m: MapMode) => void }) {
  const [w, setW] = useState(0);
  const half = Math.max(0, (w - 6) / 2);
  const target = mode === "lista" ? half : 0;
  const pill = useAnimatedStyle(() => ({
    width: half,
    transform: [{ translateX: withTiming(target, { duration: 400, easing: EASE }) }],
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      className="flex-row"
      style={{ backgroundColor: colors.subtle, borderRadius: 18, padding: 3 }}
      accessibilityRole="tablist"
    >
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 3,
              bottom: 3,
              left: 3,
              borderRadius: 15,
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(20,24,41,0.12)",
            },
            pill,
          ]}
        />
      )}
      <SegButton
        label="Mapa"
        active={mode === "mapa"}
        onPress={() => onMode("mapa")}
        icon={(c) => <MapIcon color={c} size={16} strokeWidth={2.2} />}
      />
      <SegButton
        label="Lista"
        active={mode === "lista"}
        onPress={() => onMode("lista")}
        icon={(c) => <List color={c} size={16} strokeWidth={2.2} />}
      />
    </View>
  );
}

function SegButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: (color: string) => ReactNode;
}) {
  const c = active ? colors.ink : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="flex-1 flex-row items-center justify-center"
      style={{ height: 36, gap: 6 }}
    >
      {icon(c)}
      <Text className="font-body-bold text-sm" style={{ color: c }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LayerToggle({
  label,
  count,
  on,
  color,
  ink,
  onPress,
}: {
  label: string;
  count: number;
  on: boolean;
  color: string;
  ink: string;
  onPress: () => void;
}) {
  const bg = useAnimatedStyle(() => ({
    backgroundColor: withTiming(on ? `${color}2E` : "#FFFFFF", { duration: 300 }),
    borderColor: withTiming(on ? "rgba(255,255,255,0)" : colors.subtle, { duration: 300 }),
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${label}: ${on ? "ligado" : "desligado"}`}
      className="flex-1 active:opacity-80"
    >
      <Animated.View
        className="flex-row items-center justify-center"
        style={[{ height: 38, borderRadius: 14, borderWidth: 1.5, gap: 7 }, bg]}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: on ? color : colors.border,
          }}
        />
        <Text className="font-body-bold text-[13px]" style={{ color: on ? ink : colors.muted }}>
          {label}
        </Text>
        <Text className="font-body-medium text-xs text-dim">{formatCount(count)}</Text>
      </Animated.View>
    </Pressable>
  );
}
