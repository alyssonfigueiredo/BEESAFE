import { Flag, PenLine } from "lucide-react-native";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { useReportContent, type ReportTarget } from "@/hooks/useModeration";
import { colors } from "@/theme/tokens";
import { useFolhaAberta } from "@/hooks/useDiscovery";

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
  useFolhaAberta(open);
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
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(20,24,41,0.38)" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="gap-3 rounded-t-[34px] px-6 pb-10 pt-3"
            style={{ backgroundColor: "#FBFCFE" }}
            onPress={() => {}}
          >
            {/* Alça da folha, a mesma das folhas novas. */}
            <View
              className="mb-2 h-[5px] w-11 self-center rounded-full"
              style={{ backgroundColor: colors.border }}
            />
            <Text className="font-display text-2xl uppercase tracking-wide text-ink">
              Denunciar
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {REASONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  color={colors.coral}
                  active={reason === r}
                  onPress={() => setReason(r)}
                />
              ))}
            </View>
            <Field
              icon={PenLine}
              placeholder="Detalhe se quiser (até 500 caracteres)"
              maxLength={500}
              value={reason}
              onChangeText={setReason}
            />
            <PrimaryButton
              tone="coral"
              label="Enviar denúncia"
              disabled={report.isPending}
              onPress={submit}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
