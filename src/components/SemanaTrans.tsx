import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { colors, shadow } from "@/theme/tokens";

// Semana de Conscientização Trans (13–19/11) e Dia da Memória Trans (20/11), 2026.
// Entra e sai sozinho pela data do aparelho; nada no banco. Protótipo aprovado:
// https://claude.ai/artifact/4x4yJqGXR2D9fNRJZSzdCc (A: Início, B: ficha, C: Perfil, D: 20/11).
// A faixa com as cores da bandeira trans é exceção temporária à regra de não usar bandeira.
// Mexe só na apresentação: perguntas, escalas e pesos da avaliação não mudam.

export type FaseTrans = "semana" | "memoria" | null;

const INICIO = "2026-11-13";
const FIM_SEMANA = "2026-11-19";
const MEMORIA = "2026-11-20";

function hojeISO(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function faseTrans(d = new Date()): FaseTrans {
  const h = hojeISO(d);
  if (h >= INICIO && h <= FIM_SEMANA) return "semana";
  if (h === MEMORIA) return "memoria";
  return null;
}

export const useFaseTrans = () => faseTrans();

const TRANS = ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"];

export function FaixaTrans({ w = 22, h = 15 }: { w?: number; h?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(20,24,41,0.10)",
      }}
    >
      {TRANS.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

export function SeloTrans({ texto }: { texto: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <FaixaTrans />
      <Text className="font-body-bold text-[11px] uppercase tracking-[1.5px] text-muted">{texto}</Text>
    </View>
  );
}

// Destaque do eixo Banheiro na ficha e da forma de tratamento no Perfil.
export const bordaTrans = { borderWidth: 2, borderColor: "#F5A9B8", borderRadius: 20 } as const;

const chave = (f: Exclude<FaseTrans, null>) => `irisa.semanaTrans.2026.${f}`;

export function SemanaTransCard() {
  const fase = useFaseTrans();
  const qc = useQueryClient();
  const { data: fechado } = useQuery({
    queryKey: ["semanaTrans", fase],
    enabled: !!fase,
    queryFn: async () => {
      try {
        return (await AsyncStorage.getItem(chave(fase!))) === "1";
      } catch {
        return false;
      }
    },
  });
  if (!fase || fechado !== false) return null;
  const fechar = () => {
    qc.setQueryData(["semanaTrans", fase], true);
    AsyncStorage.setItem(chave(fase), "1").catch(() => {});
  };

  const topo = (
    <View className="flex-row items-center justify-between gap-3">
      {fase === "semana" ? (
        <SeloTrans texto="Visibilidade Trans · 13 a 19/11" />
      ) : (
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.dim }} />
          <Text className="font-body-bold text-[11px] uppercase tracking-[1.5px] text-muted">
            20 de novembro · Dia da Memória Trans
          </Text>
        </View>
      )}
      <Pressable onPress={fechar} hitSlop={14} accessibilityLabel="Fechar">
        <X color={colors.dim} size={16} />
      </Pressable>
    </View>
  );

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View className="gap-3 rounded-3xl bg-solid p-5" style={shadow.card}>
        {topo}
        {fase === "semana" ? (
          <>
            <Text className="font-display text-[24px] uppercase leading-[29px] text-ink">
              {"Banheiro também\né acolhimento."}
            </Text>
            <Text className="font-body text-[14px] leading-[20px] text-muted">
              Esteve num lugar essa semana? Responde a pergunta do banheiro. Alguém vai ler antes
              de sair de casa.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => router.push("/lugares")}
                className="h-11 justify-center rounded-full bg-ink px-5 active:opacity-80"
              >
                <Text className="font-body-bold text-[14px] text-paper">Avaliar um lugar</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/perfil")}
                className="h-11 justify-center rounded-full bg-subtle px-4 active:opacity-80"
              >
                <Text className="font-body-medium text-[14px] text-ink">Seu pronome</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text className="font-display text-[24px] uppercase leading-[29px] text-ink">
              {"Hoje a gente lembra\nquem não está mais aqui."}
            </Text>
            <Text className="font-body text-[14px] leading-[20px] text-muted">
              E segue registrando, pra que a rua receba aviso. Se precisar conversar, o CVV atende
              no 188, de graça, 24 horas.
            </Text>
            <Pressable
              onPress={() => router.push("/apoio")}
              className="h-11 justify-center self-start rounded-full bg-subtle px-4 active:opacity-80"
            >
              <Text className="font-body-medium text-[14px] text-ink">Ver a aba Apoio</Text>
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}
