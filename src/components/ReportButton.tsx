import { Flag, PenLine } from "lucide-react-native";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { PrimaryButton } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { useReportContent, type ReportTarget } from "@/hooks/useModeration";
import { colors } from "@/theme/tokens";
import { useFolhaAberta } from "@/hooks/useDiscovery";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";

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
  const { panHandlers: dragHandlers, style: dragStyle } = useSheetDismiss(() => setOpen(false));

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
        {/* Fundo como IRMÃO da folha, não pai (13/10/2026, achado na auditoria: um Pressable
            ANCESTRAL da alça reivindica o responder no touch-down antes do PanResponder da alça
            ter chance de reagir no move — por isso o arrastar nunca pegava aqui, diferente das
            outras 4 folhas, que já tinham o fundo como irmão). */}
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(20,24,41,0.38)" }}
          onPress={() => setOpen(false)}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              backgroundColor: "#FBFCFE",
            },
            dragStyle,
          ]}
        >
          <View
            {...dragHandlers}
            style={{ paddingTop: 10, alignItems: "center" }}
            hitSlop={{ top: 10, bottom: 10, left: 60, right: 60 }}
          >
            {/* Alça da folha, a mesma das folhas novas. */}
            <View
              className="h-[5px] w-11 rounded-full"
              style={{ backgroundColor: colors.border }}
            />
          </View>
          <Pressable
            className="gap-3 px-6 pb-10 pt-1"
            onPress={() => {}}
          >
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
        </Animated.View>
      </Modal>
    </>
  );
}
