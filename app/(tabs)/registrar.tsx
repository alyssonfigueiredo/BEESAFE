import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ReportForm } from "@/components/ReportForm";

export default function RegistrarScreen() {
  const router = useRouter();
  return (
    <ScrollView
      className="flex-1 bg-night"
      contentContainerClassName="gap-5 px-4 py-4"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="font-display text-3xl uppercase tracking-widest text-ink">Registrar</Text>
        <Text className="font-body text-sm text-dim">Relato anônimo de LGBTIfobia</Text>
      </View>

      <ReportForm onDone={() => router.replace("/mapa")} />

      <View className="gap-3 rounded-xl border border-border bg-surface p-4">
        <Note
          title="100% anônimo"
          text="Seu nome e e-mail nunca aparecem. Nem moderadores veem quem registrou."
        />
        <Note
          title="Por que preciso estar logado?"
          text="Para evitar spam e relatos falsos. A identidade fica só no banco e nunca é exibida."
        />
        <Note
          title="Em risco agora?"
          text="Use o botão de emergência no topo. Polícia 190, Disque 100."
          color="coral"
        />
      </View>
    </ScrollView>
  );
}

function Note({ title, text, color }: { title: string; text: string; color?: "coral" }) {
  return (
    <View>
      <Text
        className={`font-body-bold text-sm ${color === "coral" ? "text-coral" : "text-turquoise"}`}
      >
        {title}
      </Text>
      <Text className="font-body text-sm text-muted">{text}</Text>
    </View>
  );
}
