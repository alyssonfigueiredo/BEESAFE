import { MoreHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";

import { BlockButton } from "@/components/BlockButton";
import { ReportButton } from "@/components/ReportButton";
import { REACTION_KINDS, type ReactionKind, type SupportMessage } from "@/hooks/useSupport";
import { SUPPORT_CATEGORIES } from "@/theme/domain";
import { colors } from "@/theme/tokens";

import { REACTIONS, ReactionIcon } from "./reactions";
import { NOTE_TINT, tempoCurto } from "./theme";

const TILT = [-0.5, 0.45, -0.3, 0.5, -0.4, 0.35];

// Recado recém-publicado: desce do topo e assenta, sem quique.
const ARRIVE = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -28 }, { rotate: "-3deg" }, { scale: 1.03 }] },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { rotate: "0deg" }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(600);

export function NoteCard({
  message: m,
  index,
  fresh,
  trayOpen,
  onToggleTray,
  onReact,
  onSeeServices,
}: {
  message: SupportMessage;
  index: number;
  fresh?: boolean;
  trayOpen: boolean;
  onToggleTray: () => void;
  onReact: (kind: ReactionKind | null) => void;
  onSeeServices: () => void;
}) {
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const tint = NOTE_TINT[m.category] ?? NOTE_TINT.acolhimento;
  const label = SUPPORT_CATEGORIES[m.category]?.label ?? "Recado";

  const counts = REACTION_KINDS.map((k) => [k, Number(m.reactions?.[k] ?? 0)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  // Banco sem a migration 43: só existe o total antigo (curtidas) e ele vira "Te abraço".
  const total = counts.length ? counts.reduce((a, [, n]) => a + n, 0) : Number(m.likes ?? 0);
  const top = counts.length
    ? counts.slice(0, 3).map(([k]) => k)
    : total > 0
      ? ["abraco" as const]
      : [];
  const mine = m.my_reaction ?? (m.liked && !m.reactions ? "abraco" : null);

  const entering = reduce
    ? undefined
    : fresh
      ? ARRIVE
      : FadeInDown.duration(420)
          .delay(120 + Math.min(index, 8) * 70)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

  return (
    <Animated.View entering={entering}>
      <View
        className="rounded-[22px] rounded-tl-[6px] px-[13px] pb-2.5 pt-3.5"
        style={{
          backgroundColor: tint.paper,
          transform: [{ rotate: `${TILT[index % TILT.length]}deg` }],
          boxShadow: "0 2px 4px rgba(20,24,41,0.06), 0 8px 18px rgba(20,24,41,0.08)",
        }}
      >
        {/* fita adesiva */}
        <View
          pointerEvents="none"
          className="absolute -top-[7px] left-1/2 h-3.5 w-11 rounded-[3px]"
          style={{
            marginLeft: -22,
            backgroundColor: "rgba(255,255,255,0.65)",
            boxShadow: "0 1px 2px rgba(20,24,41,0.08)",
          }}
        />

        <View className="flex-row items-start justify-between gap-2">
          <Text
            className="font-body-bold text-[10.5px] uppercase tracking-[1.3px]"
            style={{ color: tint.ink }}
          >
            {label}
          </Text>
          {!m.is_mine && (
            <Pressable
              onPress={() => setMenu((v) => !v)}
              hitSlop={10}
              accessibilityLabel="Mais opções"
              accessibilityState={{ expanded: menu }}
            >
              <MoreHorizontal size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {menu && !m.is_mine && (
          <Animated.View
            entering={reduce ? undefined : FadeIn.duration(180)}
            className="mt-2 flex-row gap-4 self-end rounded-full bg-solid px-3.5 py-2"
            style={{ boxShadow: "0 4px 14px rgba(20,24,41,0.12)" }}
          >
            <ReportButton type="message" id={m.id} />
            <BlockButton type="message" id={m.id} />
          </Animated.View>
        )}

        <Text className="mt-1.5 font-body text-sm leading-5 text-ink">{m.content}</Text>
        <Text className="mt-2 font-body text-[11.5px] text-muted">
          {m.nickname}
          {m.is_mine ? " (você)" : ""} · {tempoCurto(m.created_at)}
        </Text>

        <View className="mt-2.5 flex-row items-center gap-2">
          {total > 0 && (
            <View className="flex-row items-center gap-2">
              <View className="flex-row">
                {top.map((k, i) => (
                  <View
                    key={k}
                    className="h-6 w-6 items-center justify-center rounded-full bg-solid"
                    style={{
                      marginLeft: i ? -6 : 0,
                      boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
                    }}
                  >
                    <ReactionIcon kind={k} size={15} />
                  </View>
                ))}
              </View>
              <Text className="font-body-bold text-xs text-muted">{total}</Text>
            </View>
          )}
          <View className="flex-1" />
          {m.category === "pedido_ajuda" && (
            <Pressable
              onPress={onSeeServices}
              className="h-[30px] justify-center rounded-full px-3 active:opacity-70"
              style={{ backgroundColor: "rgba(255,255,255,0.75)" }}
            >
              <Text className="font-body-bold text-xs text-coralInk">Ver serviços</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onToggleTray}
            className="h-[30px] flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
            style={{ backgroundColor: mine ? colors.night : "rgba(255,255,255,0.75)" }}
            accessibilityRole="button"
            accessibilityLabel={mine ? `Sua reação: ${REACTIONS[mine].label}. Trocar` : "Reagir"}
            accessibilityState={{ expanded: trayOpen }}
          >
            {mine && <ReactionIcon kind={mine} size={14} />}
            <Text
              className="font-body-bold text-xs"
              style={{ color: mine ? "#FFFFFF" : colors.ink }}
            >
              {mine ? REACTIONS[mine].label : "Reagir"}
            </Text>
          </Pressable>
        </View>

        {trayOpen && (
          <Animated.View
            entering={
              reduce
                ? undefined
                : FadeInDown.duration(260).withInitialValues({
                    opacity: 0,
                    transform: [{ translateY: 6 }],
                  })
            }
            className="mt-2.5 flex-row justify-between gap-0.5 rounded-[20px] bg-solid p-1.5"
            style={{ boxShadow: "0 8px 22px rgba(20,24,41,0.16)" }}
          >
            {REACTION_KINDS.map((k, i) => {
              const on = mine === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => onReact(on ? null : k)}
                  className="min-w-0 flex-1 items-center gap-1 rounded-[14px] px-px pb-1.5 pt-[7px]"
                  style={{ backgroundColor: on ? colors.subtle : "transparent" }}
                  accessibilityRole="button"
                  accessibilityLabel={on ? `Tirar ${REACTIONS[k].label}` : REACTIONS[k].label}
                  accessibilityState={{ selected: on }}
                >
                  <Animated.View entering={reduce ? undefined : ZoomIn.duration(260).delay(40 * i)}>
                    <ReactionIcon kind={k} size={26} />
                  </Animated.View>
                  <Text
                    className="text-center font-body-bold text-[10.5px] leading-[12px]"
                    style={{ color: on ? colors.ink : colors.muted }}
                    numberOfLines={2}
                  >
                    {REACTIONS[k].label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
