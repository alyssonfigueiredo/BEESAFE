import { requireOptionalNativeModule } from "expo";
import { Camera, Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  Text,
  TurboModuleRegistry,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { FadeUp } from "@/components/gami/Anim";
import { Confete } from "@/components/gami/Confete";
import { NivelIcone } from "@/components/gami/NivelIcone";
import { MedalView } from "@/components/gami/MedalView";
import { Mark } from "@/components/Mark";
import { useFolhaAberta } from "@/hooks/useDiscovery";
import { useForma } from "@/hooks/useGamification";
import { getMedalha, nomeDa, type Banho } from "@/lib/medals";
import { nomeNivel, NIVEIS_EVO } from "@/lib/niveis";
import { colors } from "@/theme/tokens";

// Cartão de story (1080 × 1920) de uma medalha ou do nível. A pessoa vê a prévia antes e escolhe
// compartilhar; o menu do próprio celular oferece o Instagram (story, direct) e o resto.
// Regras da proposta: nunca nome de lugar, nunca o apelido da pessoa, nunca nada de relato.
// As duas peças são nativas (react-native-view-shot e expo-sharing): em build sem elas, o botão
// simplesmente não aparece, então o mesmo código pode chegar por EAS Update sem quebrar nada.

export type Compartilhavel =
  { tipo: "medalha"; id: string; banho?: Banho | null } | { tipo: "nivel"; k: number };

const W = 360;
const H = 640;
/** Centro vertical da medalha no cartão (o halo do fundo acompanha). */
const HALO_Y = 232;

// ID público do app Irisa na Meta: o Instagram exige no compartilhamento direto para o story.
const META_APP_ID = "2296597601132815";

/** Compartilhamento direto no story (react-native-share, nativo): só em build que tem a peça. */
function storyDisponivel() {
  try {
    return !!(TurboModuleRegistry.get("RNShare") ?? NativeModules.RNShare);
  } catch {
    return false;
  }
}

export function podeCompartilhar() {
  if (Platform.OS === "web") return false;
  if (!requireOptionalNativeModule("ExpoSharing")) return false;
  try {
    return !!(TurboModuleRegistry.get("RNViewShot") ?? NativeModules.RNViewShot);
  } catch {
    return false;
  }
}

function Fundo() {
  // As quatro manchas de cor do papel da marca.
  const manchas: [string, number, number][] = [
    [colors.turquoise, 0, 0],
    [colors.coral, W, 60],
    [colors.lilac, W, H],
    [colors.yellow, 0, H - 80],
  ];
  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        {manchas.map(([c], i) => (
          <RadialGradient key={i} id={`stm${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c} stopOpacity={0.4} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect width={W} height={H} fill={colors.paper} />
      {manchas.map(([, x, y], i) => (
        <Rect key={i} x={x - 230} y={y - 230} width={460} height={460} fill={`url(#stm${i})`} />
      ))}
      {/* Halo claro atrás da medalha: dá o destaque sem moldura. */}
      <Defs>
        <RadialGradient id="sthalo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={W / 2 - 170} y={HALO_Y - 170} width={340} height={340} fill="url(#sthalo)" />
    </Svg>
  );
}

const ARCO = [
  colors.coral,
  colors.orange,
  colors.yellow,
  colors.turquoise,
  "#59A7FF",
  colors.lilac,
];

/** Brilhinhos de quatro pontas em volta da medalha (parados: a imagem é estática). */
function Brilhos() {
  const pts: [number, number, number, string][] = [
    [72, 196, 9, colors.yellow],
    [292, 176, 7, colors.coral],
    [300, 318, 10, colors.turquoise],
    [62, 330, 6, colors.lilac],
  ];
  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      {pts.map(([x, y, r, c], i) => (
        <Path
          key={i}
          d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
          fill={c}
        />
      ))}
    </Svg>
  );
}

/**
 * O cartão em si, no tamanho lógico 360 × 640 (a captura sai em 1080 × 1920). Blocos empilhados em
 * coluna (nunca posicionados por cima um do outro), dentro da área que o Instagram não cobre:
 * ~90 px no topo e ~110 px embaixo ficam para a interface do story.
 */
function Cartao({ c, forma }: { c: Compartilhavel; forma: number }) {
  const medalha = c.tipo === "medalha" ? getMedalha(c.id) : null;
  const nivel = c.tipo === "nivel" ? NIVEIS_EVO[c.k] : null;
  const rotulo = medalha ? "Desbloqueei na Irisa" : "Meu nível na Irisa";
  const nome = medalha ? nomeDa(medalha, forma) : nivel ? nomeNivel(nivel, forma) : "";
  const frase = medalha ? medalha.copy : (nivel?.t ?? "");
  const extra = nivel && c.tipo === "nivel" ? `Nível ${c.k + 1} de 8` : null;
  return (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      <Fundo />
      <Brilhos />
      <View style={{ flex: 1, paddingTop: 92, paddingBottom: 104, paddingHorizontal: 30 }}>
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.72)",
            }}
          >
            <Text
              className="font-body-bold uppercase"
              style={{ fontSize: 11, letterSpacing: 2.2, color: colors.ink }}
            >
              {rotulo}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {medalha ? (
            <MedalView
              id={medalha.id}
              size={200}
              on
              banho={c.tipo === "medalha" ? (c.banho ?? null) : null}
            />
          ) : nivel && c.tipo === "nivel" ? (
            <View
              className="items-center justify-center rounded-full bg-solid"
              style={{ width: 188, height: 188, boxShadow: "0 18px 40px rgba(20,24,41,0.14)" }}
            >
              <NivelIcone k={c.k} size={142} />
            </View>
          ) : null}
          {extra && (
            <Text
              className="mt-4 font-body-bold uppercase"
              style={{ fontSize: 11, letterSpacing: 2, color: colors.turquoiseInk }}
            >
              {extra}
            </Text>
          )}
          <Text
            className="text-center font-display uppercase text-ink"
            style={{ fontSize: 40, lineHeight: 43, marginTop: extra ? 6 : 22 }}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {nome}
          </Text>
          <View style={{ flexDirection: "row", gap: 3, marginTop: 14 }}>
            {ARCO.map((cor) => (
              <View
                key={cor}
                style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: cor }}
              />
            ))}
          </View>
          <Text
            className="text-center font-body"
            style={{
              fontSize: 15.5,
              lineHeight: 22,
              color: colors.muted,
              marginTop: 14,
              maxWidth: 270,
            }}
            numberOfLines={3}
          >
            {medalha ? `“${frase}”` : frase}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: 6 }}>
          <View className="flex-row items-center gap-2">
            <Mark size={26} />
            <Text
              className="font-wordmark uppercase text-ink"
              style={{ fontSize: 19, letterSpacing: 2.9 }}
            >
              Iris<Text style={{ color: colors.amber }}>a</Text>
            </Text>
          </View>
          <Text
            className="text-center font-body"
            style={{ fontSize: 11.5, lineHeight: 16, color: colors.muted, maxWidth: 250 }}
          >
            O mapa dos lugares onde a gente é bem-vinde, feito por nós.
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Prévia em tela cheia com o botão de compartilhar. `c` nulo = fechado. */
export function CompartilharSheet({
  c,
  onClose,
}: {
  c: Compartilhavel | null;
  onClose: () => void;
}) {
  const forma = useForma();
  const { width, height } = useWindowDimensions();
  const ref = useRef<View>(null);
  const [ocupado, setOcupado] = useState<"story" | "outros" | null>(null);
  useFolhaAberta(!!c);
  const escala = Math.min((width - 72) / W, (height - 300) / H, 1);
  // Uma explosão nova cada vez que a prévia abre com outro cartão.
  const chave = c ? (c.tipo === "medalha" ? c.id : `nivel-${c.k}`) : "";

  async function capturar() {
    const { captureRef } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-view-shot") as typeof import("react-native-view-shot");
    return captureRef(ref, { format: "png", quality: 1, width: 1080, height: 1920 });
  }

  async function outrosApps(uri?: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");
    await Sharing.shareAsync(uri ?? (await capturar()), {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: "Compartilhar",
    });
  }

  async function rodar(qual: "story" | "outros") {
    if (!ref.current || ocupado) return;
    setOcupado(qual);
    try {
      const uri = await capturar();
      if (qual === "outros" || !storyDisponivel()) return await outrosApps(uri);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = require("react-native-share") as typeof import("react-native-share");
      const RNShare = lib.default;
      try {
        await RNShare.shareSingle({
          social: lib.Social.InstagramStories,
          appId: META_APP_ID,
          backgroundImage: uri,
        });
      } catch (e) {
        // Instagram não instalado (ou a pessoa voltou sem postar): cai no menu do celular.
        const msg = e instanceof Error ? e.message : String(e);
        if (/cancel|dismiss/i.test(msg)) return;
        await outrosApps(uri);
      }
    } catch (e) {
      Alert.alert("Não deu para compartilhar", e instanceof Error ? e.message : "Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Modal
      visible={!!c}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {c && (
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: colors.night }}
        >
          <FadeUp distance={6} duration={300}>
            <Text
              className="mb-4 text-center font-body-medium uppercase"
              style={{ fontSize: 11.5, letterSpacing: 2, color: "#8A90AA" }}
            >
              Prévia do seu story
            </Text>
          </FadeUp>
          <View style={{ width: W * escala, height: H * escala }}>
            <FadeUp distance={12} duration={380}>
              <View
                style={{
                  width: W * escala,
                  height: H * escala,
                  borderRadius: 28,
                  overflow: "hidden",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
                }}
              >
                <View style={{ transform: [{ scale: escala }], transformOrigin: "top left" }}>
                  <View ref={ref} collapsable={false}>
                    <Cartao c={c} forma={forma} />
                  </View>
                </View>
              </View>
            </FadeUp>
            {/* Fora da captura: o confete é da tela, não entra na imagem do story. */}
            <Confete key={chave} x={(W * escala) / 2} y={HALO_Y * escala} />
          </View>
          <View className="mt-6 w-full gap-2 px-8">
            <Pressable
              onPress={() => rodar("story")}
              disabled={!!ocupado}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-paper active:opacity-85"
              style={{ opacity: ocupado ? 0.6 : 1 }}
            >
              <Camera color={colors.night} size={18} strokeWidth={2.2} />
              <Text className="font-body-bold text-[16px] text-night">
                {ocupado === "story" ? "Abrindo o Instagram…" : "Story do Instagram"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => rodar("outros")}
              disabled={!!ocupado}
              className="h-[48px] flex-row items-center justify-center gap-2 rounded-full active:opacity-80"
              style={{
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.35)",
                opacity: ocupado ? 0.6 : 1,
              }}
            >
              <Share2 color={colors.paper} size={16} strokeWidth={2.4} />
              <Text className="font-body-bold text-[15px] text-paper">
                {ocupado === "outros" ? "Preparando…" : "Outros apps"}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} className="items-center py-3 active:opacity-70">
              <Text className="font-body-bold text-[15px] text-paper">Fechar</Text>
            </Pressable>
            <Text className="text-center font-body text-[12px]" style={{ color: "#8A90AA" }}>
              Sem seu nome e sem nenhum lugar. Em Outros apps: WhatsApp, salvar imagem e o resto.
            </Text>
          </View>
        </View>
      )}
    </Modal>
  );
}

/** Botão pequeno para abrir a prévia; some quando a build não tem as peças nativas. */
export function BotaoCompartilhar({
  onPress,
  escuro = false,
  label = "Compartilhar no story",
}: {
  onPress: () => void;
  escuro?: boolean;
  label?: string;
}) {
  if (!podeCompartilhar()) return null;
  const cor = escuro ? colors.paper : colors.night;
  return (
    <Pressable
      onPress={onPress}
      className="h-[46px] flex-row items-center justify-center gap-2 rounded-full active:opacity-80"
      style={{ borderWidth: 1.5, borderColor: escuro ? "rgba(255,255,255,0.35)" : colors.border }}
      accessibilityRole="button"
    >
      <Share2 color={cor} size={16} strokeWidth={2.4} />
      <Text className="font-body-bold text-[14px]" style={{ color: cor }}>
        {label}
      </Text>
    </Pressable>
  );
}
