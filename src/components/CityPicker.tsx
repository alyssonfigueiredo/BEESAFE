import { ChevronDown, X } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { supabase } from "@/lib/supabase";
import type { City } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { colors } from "@/theme/tokens";

export function CityPicker() {
  const { city, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const term = q.trim();
  const { data: results = [] } = useQuery({
    queryKey: ["city-search", term],
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("city_search", { p_name: term });
      if (error) throw error;
      return (data as City[]) ?? [];
    },
  });

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center gap-1 self-start">
        <Text className="font-body-medium text-sm text-turquoiseInk">
          {city ? `${city.name} · ${city.state}` : "Escolher cidade"}
        </Text>
        <ChevronDown color={colors.turquoiseInk} size={16} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 gap-4 bg-paper px-4 pt-14">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl uppercase tracking-widest text-ink">Cidade</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <X color={colors.muted} size={24} />
            </Pressable>
          </View>
          <TextInput
            autoFocus
            className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
            placeholder="Digite o nome da cidade"
            placeholderTextColor={colors.dim}
            value={q}
            onChangeText={setQ}
          />
          <FlatList
            data={results}
            keyExtractor={(c) => String(c.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCity(item);
                  setOpen(false);
                  setQ("");
                }}
                className="border-b border-border py-3"
              >
                <Text className="font-body text-base text-ink">
                  {item.name} <Text className="text-dim">· {item.state}</Text>
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              q.length >= 2 ? (
                <Text className="font-body text-sm text-dim">Nenhuma cidade encontrada.</Text>
              ) : null
            }
          />
        </View>
      </Modal>
    </>
  );
}
