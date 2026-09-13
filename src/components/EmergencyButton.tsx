import { Siren, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { EMERGENCY_CONTACTS } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.6 }],
    opacity: 0.6 * (1 - pulse.value),
  }));

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="mr-4 h-10 w-10 items-center justify-center"
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: colors.coral,
            },
            ring,
          ]}
        />
        <View className="h-10 w-10 items-center justify-center rounded-full bg-coral">
          <Siren color={colors.night} size={20} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="gap-4 rounded-t-3xl border-t border-border bg-surface px-6 pb-10 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-2xl uppercase tracking-widest text-ink">
                Emergência
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <X color={colors.muted} size={24} />
              </Pressable>
            </View>
            {EMERGENCY_CONTACTS.map((c) => (
              <Pressable
                key={c.number}
                onPress={() => Linking.openURL(`tel:${c.number}`)}
                className="flex-row items-center gap-4 rounded-xl border border-border bg-night px-4 py-3 active:opacity-80"
              >
                <Text className="font-display text-3xl text-coral">{c.number}</Text>
                <View className="flex-1">
                  <Text className="font-body-bold text-base text-ink">{c.name}</Text>
                  <Text className="font-body text-sm text-dim">{c.note}</Text>
                </View>
              </Pressable>
            ))}
            <Text className="font-body text-xs text-dim">
              Serviços de apoio da sua cidade aparecem aqui na fase 3.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
