import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { PlaceForm } from "@/components/PlaceForm";
import { ReportForm } from "@/components/ReportForm";
import { colors, shadow } from "@/theme/tokens";

export default function RegistrarScreen() {
  const insets = useScreenInsets();
  const router = useRouter();
  // ?modo=lugar abre direto na aba do cadastro: quem veio do "Cadastre um lugar" da aba Lugares
  // já sabe o que quer, e não deve ter que achar o seletor.
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const [mode, setMode] = useState<"relato" | "lugar">(modo === "lugar" ? "lugar" : "relato");
  // A tela fica montada no fundo (é uma aba escondida), então o useState só valeria na primeira
  // abertura. Ajuste durante o render — o padrão do React para reagir a prop nova sem effect.
  const [modoVisto, setModoVisto] = useState(modo);
  if (modo !== modoVisto) {
    setModoVisto(modo);
    setMode(modo === "lugar" ? "lugar" : "relato");
  }

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-4"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="font-display text-2xl uppercase tracking-wide text-ink">Registrar</Text>
          <Text className="font-body text-sm text-dim">
            {mode === "relato"
              ? "Relato anônimo de LGBTIfobia"
              : "Um lugar para a comunidade avaliar"}
          </Text>
        </View>

        <View className="flex-row rounded-full bg-subtle p-1" style={shadow.card}>
          {(["relato", "lugar"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              className="flex-1 items-center rounded-full py-2"
              style={{
                backgroundColor:
                  mode === m ? (m === "relato" ? colors.coral : colors.turquoise) : "transparent",
              }}
            >
              <Text
                className="font-body-bold text-sm"
                style={{ color: mode === m ? colors.night : colors.muted }}
              >
                {m === "relato" ? "Relato" : "Lugar"}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === "relato" ? (
          <ReportForm onDone={() => router.replace("/mapa")} />
        ) : (
          // push, nunca replace: a ficha do lugar vive no stack de cima: replace trocava a
          // própria aba por ela, e aí não havia botão de voltar nem barra de abas — só fechar
          // o app saía da tela (relatado por ele em 01/10/2026).
          <PlaceForm onDone={(id) => router.push({ pathname: "/lugar/[id]", params: { id } })} />
        )}

        <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
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
    </View>
  );
}

function Note({ title, text, color }: { title: string; text: string; color?: "coral" }) {
  return (
    <View>
      <Text
        className={`font-body-bold text-sm ${color === "coral" ? "text-coralInk" : "text-turquoiseInk"}`}
      >
        {title}
      </Text>
      <Text className="font-body text-sm text-muted">{text}</Text>
    </View>
  );
}
