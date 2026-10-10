import { Image, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { TourTarget } from "@/components/Tour";
import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { IriseBalao, useRodadaFalas } from "@/components/irise-personagem/IriseBalao";
import { useFotoTrocada } from "@/hooks/useIrisePersonagens";
import { FALAS, type Fala } from "@/lib/iriseFalas";
import { avatarCardSrc } from "@/lib/iriseImagensEscuras";
import { BUNDLED_N } from "@/lib/irisePersonagens";
import { shadow } from "@/theme/tokens";

const ARCO = ["#FF6964", "#FFA353", "#FFD066", "#49DCC0", "#59A7FF", "#A889FF"];

/** Ocupa a largura toda da tela (sem padding lateral do pai). Substitui o card escuro da cidade. */
export function CardCidadeIrise({
  personagem,
  nomeIrise,
  cidade,
  uf,
  bemVinde,
  onTrocarCidade,
  onAvaliar,
  onRelato,
  onCta,
  onAbrirChat,
  falas = FALAS,
}: {
  personagem: number;
  nomeIrise: string;
  cidade: string;
  uf: string;
  bemVinde: string;
  onTrocarCidade: () => void;
  onAvaliar: () => void;
  onRelato: () => void;
  onCta: (f: Fala) => void;
  onAbrirChat: (f: Fala | null) => void;
  falas?: Fala[];
}) {
  const r = useRodadaFalas(falas);
  const estiloAvatar = useAnimatedStyle(() => ({ opacity: r.opacidade.get() }));
  // Sem fala nenhuma (filtradas fora na Início), não tem o que mostrar no balão — mas o irise
  // continua no card, com a pose padrão (1).
  const pose = falas.length > 0 ? r.fala.pose : 1;
  // Foto trocada pelo admin: mesmo um dos 9 originais passa a montar o avatar na hora (como um
  // personagem novo), em vez de ficar preso na versão "avatar-card" embutida e desatualizada.
  const fotoTrocada = useFotoTrocada(personagem);
  const usaEmbutido = BUNDLED_N.has(personagem) && !fotoTrocada;
  return (
    <View style={{ marginTop: 10 }}>
      {falas.length > 0 && r.visivel ? (
        <IriseBalao
          nome={nomeIrise}
          fala={r.fala}
          total={falas.length}
          indice={r.i}
          opacidade={r.opacidade}
          onPular={r.pular}
          onCta={() => onCta(r.fala)}
          onFechar={r.fechar}
        />
      ) : (
        <View style={{ height: 50 }} />
      )}

      <View style={{ marginHorizontal: 12, marginTop: 8, height: 248 }}>
        <View style={{ flex: 1, borderRadius: 30, backgroundColor: "#171A2B", overflow: "hidden" }}>
          <Svg width={150} height={150} style={{ position: "absolute", right: -4, top: -20 }} pointerEvents="none">
            <Defs>
              <RadialGradient id="glIrise" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#A889FF" stopOpacity={0.35} />
                <Stop offset="0.68" stopColor="#A889FF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={150} height={150} fill="url(#glIrise)" />
          </Svg>
          <View style={{ position: "absolute", left: 18, top: 20, width: 196 }}>
            <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, letterSpacing: 1.26, color: "#B7BCCB" }}>
              SUA CIDADE
            </Text>
            <Text style={{ marginTop: 6, fontFamily: "Oswald_700Bold", fontSize: 28, color: "#FFFFFF" }}>
              {cidade.toUpperCase()}
            </Text>
            <Pressable onPress={onTrocarCidade}>
              <Text style={{ marginTop: 2, fontFamily: "SpaceGrotesk_400Regular", fontSize: 11, color: "#C9CDD8" }}>
                {cidade} · {uf} ⌄
              </Text>
            </Pressable>
            <View style={{ marginTop: 12, width: 96, height: 4, borderRadius: 2, overflow: "hidden", flexDirection: "row" }}>
              {ARCO.map((c) => (
                <View key={c} style={{ flex: 1, backgroundColor: c }} />
              ))}
            </View>
          </View>
          <Text
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              top: 148,
              fontFamily: "SpaceGrotesk_400Regular",
              fontSize: 11.5,
              lineHeight: 16.3,
              color: "#C9CDD8",
            }}
          >
            O mapa dos lugares onde a gente é{" "}
            <Text style={{ fontFamily: "SpaceGrotesk_700Bold", color: "#FFD066" }}>{bemVinde}</Text>, feito por nós. Diga
            quanta cor tem os lugares por onde você passa.
          </Text>
          <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, flexDirection: "row", gap: 8 }}>
            <TourTarget id="avaliar" style={{ flex: 1 }}>
              <Pressable
                onPress={onAvaliar}
                hitSlop={{ top: 4, bottom: 4 }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#49DCC0",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  shadow.turquoise,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, color: "#141829" }}>Avaliar um lugar</Text>
              </Pressable>
            </TourTarget>
            <TourTarget id="relato" style={{ flex: 1 }}>
              <Pressable
                onPress={onRelato}
                hitSlop={{ top: 4, bottom: 4 }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#FF6964",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  shadow.coral,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, color: "#141829" }}>Registrar relato</Text>
              </Pressable>
            </TourTarget>
          </View>
        </View>
        {/* Irise fora do overflow do card: só a pontinha do cabelo passa da borda (top -4). */}
        <Pressable
          onPress={() => onAbrirChat(falas.length > 0 ? r.fala : null)}
          hitSlop={6}
          style={({ pressed }) => [{ position: "absolute", right: 18, top: -4 }, pressed && { opacity: 0.8 }]}
        >
          <Animated.View style={[{ width: 108, height: 140 }, estiloAvatar]}>
            {usaEmbutido ? (
              <Image source={avatarCardSrc(pose, personagem)} style={{ width: 108, height: 140 }} />
            ) : (
              // Personagem criado pelo admin: não tem a versão "avatar-card" pronta (precisa de
              // composição gráfica à parte), então monta o avatar na hora, com fundo escuro.
              <IriseAvatar personagem={personagem} pose={pose} size={108} fundo="escuro" />
            )}
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
