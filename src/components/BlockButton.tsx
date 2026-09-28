import { Ban } from "lucide-react-native";
import { Alert, Pressable, Text } from "react-native";

import { useBlockAuthor } from "@/hooks/useBlocks";
import type { ReportTarget } from "@/hooks/useModeration";
import { colors } from "@/theme/tokens";

const LABEL: Record<string, string> = {
  message: "as mensagens",
  rating: "as avaliações",
};

/** Esconde, só para quem toca, tudo que o autor desse conteúdo publicar. Desfaz no Perfil. */
export function BlockButton({
  type,
  id,
  compact,
}: {
  type: ReportTarget;
  id: string;
  compact?: boolean;
}) {
  const block = useBlockAuthor();

  function confirm() {
    Alert.alert(
      "Bloquear essa pessoa?",
      `Você deixa de ver ${LABEL[type] ?? "o conteúdo"} dela e tudo o mais que ela publicar. Ela não é avisada. Dá para desfazer no Perfil.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: () =>
            block
              .mutateAsync({ type, id })
              .then(() =>
                Alert.alert("Pessoa bloqueada", "O que ela publicou não aparece mais para você."),
              )
              .catch((e) =>
                Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo."),
              ),
        },
      ],
    );
  }

  return (
    <Pressable
      onPress={confirm}
      disabled={block.isPending}
      hitSlop={8}
      className="flex-row items-center gap-1"
      accessibilityLabel="Bloquear autor"
    >
      <Ban size={14} color={colors.dim} />
      {!compact && <Text className="font-body text-xs text-dim">Bloquear</Text>}
    </Pressable>
  );
}
