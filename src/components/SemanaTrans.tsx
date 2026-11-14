import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { faseTrans, type FaseTrans } from "@/lib/semanaTrans";
import { colors, shadow } from "@/theme/tokens";

// Semana de Conscientização Trans (13–19/11) e Dia da Memória Trans (20/11), 2026.
// Entra e sai sozinho pela data do aparelho; nada no banco. Protótipo aprovado:
// https://claude.ai/artifact/4x4yJqGXR2D9fNRJZSzdCc (A: Início, B: ficha, C: Perfil, D: 20/11).
// A faixa com as cores da bandeira trans é exceção temporária à regra de não usar bandeira.
// Mexe só na apresentação: perguntas, escalas e pesos da avaliação não mudam.

export { faseTrans, type FaseTrans };

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
  const [{ w, h }, setTam] = useState({ w: 0, h: 0 });
  if (!fase || fechado !== false) return null;
  const tingido = fase === "semana";
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
      <View
        className="gap-3 rounded-3xl bg-solid p-5"
        onLayout={(e) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={
          tingido
            ? { boxShadow: "0 18px 44px rgba(91,206,250,0.26), 0 6px 18px rgba(245,169,184,0.28)" }
            : shadow.card
        }
      >
        {/* Vidro tingido: azul num canto, rosa no outro, e a borda em degradê da bandeira. */}
        {tingido && w > 0 && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 0, width: w, height: h, borderRadius: 24, overflow: "hidden" }}
          >
            <Svg width={w} height={h}>
              <Defs>
                <RadialGradient id="stAzul" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#5BCEFA" stopOpacity={0.38} />
                  <Stop offset="1" stopColor="#5BCEFA" stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id="stRosa" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#F5A9B8" stopOpacity={0.42} />
                  <Stop offset="1" stopColor="#F5A9B8" stopOpacity={0} />
                </RadialGradient>
                <LinearGradient id="stBorda" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#5BCEFA" />
                  <Stop offset="1" stopColor="#F5A9B8" />
                </LinearGradient>
              </Defs>
              <Ellipse cx={0} cy={0} rx={w * 0.62} ry={h * 0.8} fill="url(#stAzul)" />
              <Ellipse cx={w} cy={h} rx={w * 0.62} ry={h * 0.8} fill="url(#stRosa)" />
              <Rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={23.25} fill="none" stroke="url(#stBorda)" strokeWidth={1.5} />
            </Svg>
          </View>
        )}
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
                className="h-11 justify-center rounded-full bg-solid px-4 active:opacity-80"
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
