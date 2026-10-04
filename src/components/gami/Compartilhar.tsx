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
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { FadeUp } from "@/components/gami/Anim";
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
    </Svg>
  );
}

/** O cartão em si, no tamanho lógico 360 × 640 (a captura sai em 1080 × 1920). */
function Cartao({ c, forma }: { c: Compartilhavel; forma: number }) {
  const medalha = c.tipo === "medalha" ? getMedalha(c.id) : null;
  const nivel = c.tipo === "nivel" ? NIVEIS_EVO[c.k] : null;
  const rotulo = medalha ? "Desbloqueei na Irisa" : "Meu nível na Irisa";
  const nome = medalha ? nomeDa(medalha, forma) : nivel ? nomeNivel(nivel, forma) : "";
  const frase = medalha ? medalha.copy : (nivel?.t ?? "");
  return (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      <Fundo />
      {/* Fora das faixas de cima e de baixo, que o Instagram cobre com a própria interface. */}
      <View style={{ position: "absolute", top: 104, left: 28, right: 28, alignItems: "center" }}>
        <Text
          className="font-body-medium uppercase"
          style={{ fontSize: 12, letterSpacing: 2.4, color: colors.muted }}
        >
          {rotulo}
        </Text>
        <View style={{ marginTop: 22 }}>
          {medalha ? (
            <MedalView
              id={medalha.id}
              size={210}
              on
              banho={c.tipo === "medalha" ? (c.banho ?? null) : null}
            />
          ) : nivel && c.tipo === "nivel" ? (
            <View
              className="items-center justify-center rounded-full bg-solid"
              style={{ width: 196, height: 196, boxShadow: "0 18px 40px rgba(20,24,41,0.14)" }}
            >
              <NivelIcone k={c.k} size={150} />
            </View>
          ) : null}
        </View>
        <Text
          className="mt-6 text-center font-display uppercase text-ink"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          {nome}
        </Text>
        <Text
          className="mt-3 text-center font-body"
          style={{ fontSize: 16, lineHeight: 23, color: colors.muted, maxWidth: 280 }}
        >
          {medalha ? `“${frase}”` : frase}
        </Text>
      </View>
      <View
        style={{ position: "absolute", bottom: 112, left: 28, right: 28, alignItems: "center" }}
      >
        <View className="flex-row items-center gap-2.5">
          <Mark size={30} />
          <Text
            className="font-wordmark uppercase text-ink"
            style={{ fontSize: 22, letterSpacing: 3.3 }}
          >
            Iris<Text style={{ color: colors.amber }}>a</Text>
          </Text>
        </View>
        <Text
          className="mt-2 text-center font-body"
          style={{ fontSize: 12.5, lineHeight: 17, color: colors.muted }}
        >
          O mapa dos lugares onde a gente é bem-vinde, feito por nós.
        </Text>
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
  const escala = Math.min((width - 64) / W, (height - 260) / H, 1);

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
          <FadeUp distance={12} duration={360}>
            <View
              style={{
                width: W * escala,
                height: H * escala,
                borderRadius: 26,
                overflow: "hidden",
              }}
            >
              <View style={{ transform: [{ scale: escala }], transformOrigin: "top left" }}>
                <View ref={ref} collapsable={false}>
                  <Cartao c={c} forma={forma} />
                </View>
              </View>
            </View>
          </FadeUp>
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
