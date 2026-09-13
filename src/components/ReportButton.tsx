import { Flag } from "lucide-react-native";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";

import { useReportContent, type ReportTarget } from "@/hooks/useModeration";
import { colors } from "@/theme/tokens";

const REASONS = [
  "Conteúdo falso",
  "Ofensivo ou discriminatório",
  "Expõe dados de alguém",
  "Spam",
  "Outro",
];

export function ReportButton({
  type,
  id,
  compact,
}: {
  type: ReportTarget;
  id: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const report = useReportContent();

  async function submit() {
    if (reason.trim().length < 3) return Alert.alert("Escolha ou escreva um motivo.");
    try {
      await report.mutateAsync({ type, id, reason });
      setOpen(false);
      setReason("");
      Alert.alert(
        "Denúncia enviada",
        "A moderação vai revisar. Com 3 denúncias o conteúdo some até a revisão.",
      );
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} className="flex-row items-center gap-1">
        <Flag size={14} color={colors.dim} />
        {!compact && <Text className="font-body text-xs text-dim">Denunciar</Text>}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable
            className="gap-3 rounded-t-3xl border-t border-border bg-surface px-6 pb-10 pt-6"
            onPress={() => {}}
          >
            <Text className="font-display text-2xl uppercase tracking-widest text-ink">
              Denunciar
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {REASONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  className="rounded-full border px-3 py-1.5"
                  style={{
                    borderColor: colors.coral,
                    backgroundColor: reason === r ? colors.coral : "transparent",
                  }}
                >
                  <Text
                    className="font-body-medium text-xs"
                    style={{ color: reason === r ? colors.night : colors.coral }}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              className="rounded-xl border border-border bg-night px-4 py-3 font-body text-base text-ink"
              placeholder="Detalhe se quiser (até 500 caracteres)"
              placeholderTextColor={colors.dim}
              maxLength={500}
              value={reason}
              onChangeText={setReason}
            />
            <Pressable
              disabled={report.isPending}
              onPress={submit}
              className="items-center rounded-xl bg-coral py-3 active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-heading text-base uppercase tracking-widest text-night">
                Enviar denúncia
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
