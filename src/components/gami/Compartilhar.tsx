import { requireOptionalNativeModule } from "expo";
import { Camera, Share2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  Text,
  TurboModuleRegistry,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { FadeUp } from "@/components/gami/Anim";
import { Confete } from "@/components/gami/Confete";
import { NivelIcone } from "@/components/gami/NivelIcone";
import { MedalView } from "@/components/gami/MedalView";
import { MEDALHA_IMG, NIVEL_IMG } from "@/lib/medalImagens";
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
/** Centro vertical do cartão de vidro (de onde o confete sai). */
const HALO_Y = 360;

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

// Cartão na identidade dos posts do Instagram (skill irisa-posts): papel com as quatro manchas,
// eyebrow em cor Ink, título Oswald com uma parte leve e o nome forte em arco-íris, o objeto 3D num
// cartão de vidro, frase em corpo e a assinatura #radarmin + IRISa centralizada embaixo.

const GOMOS16 = [
  "#ff6964",
  "#ff8e5a",
  "#ffa353",
  "#ffbf5f",
  "#ffd066",
  "#bed582",
  "#74d6a4",
  "#49dcc0",
  "#4fcbdc",
  "#52b4f5",
  "#59a7ff",
  "#7d96ff",
  "#a889ff",
  "#c681dd",
  "#ea709b",
  "#ff636e",
];

function arco(r1: number, r2: number, a0: number, a1: number) {
  const p = (r: number, a: number) =>
    [50 + r * Math.cos(a), 50 + r * Math.sin(a)].map((v) => v.toFixed(2));
  const [x1, y1] = p(r2, a0),
    [x2, y2] = p(r2, a1),
    [x3, y3] = p(r1, a1),
    [x4, y4] = p(r1, a0);
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}

/** #radarmin: só o anel de gomos, centro vazio (a assinatura dos posts). */
function RadarMin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: 48 }, (_, i) => {
        const a0 = ((-90 + 7.5 * i + 0.8) * Math.PI) / 180;
        const a1 = ((-90 + 7.5 * (i + 1) - 0.8) * Math.PI) / 180;
        return <Path key={i} d={arco(30, 48, a0, a1)} fill={GOMOS16[Math.floor(i / 3)]} />;
      })}
    </Svg>
  );
}

/** Linhas do nome escritas para caber (como os títulos dos posts, quebra à mão por palavra). */
function linhasDoNome(nome: string, max = 13) {
  const palavras = nome.toUpperCase().split(" ");
  const linhas: string[] = [];
  for (const p of palavras) {
    const ult = linhas[linhas.length - 1];
    if (ult && (ult + " " + p).length <= max) linhas[linhas.length - 1] = ult + " " + p;
    else linhas.push(p);
  }
  return linhas.slice(0, 3);
}

/** Nome forte em arco-íris (Oswald 700), uma linha por <text>, centralizado. */
function NomeArcoIris({ nome }: { nome: string }) {
  const linhas = linhasDoNome(nome);
  const maior = Math.max(...linhas.map((l) => l.length));
  const fs = Math.min(50, Math.floor(296 / (maior * 0.5)));
  const lh = fs * 1.14;
  return (
    <Svg width={W - 40} height={lh * linhas.length + fs * 0.16}>
      <Defs>
        <LinearGradient id="stnome" x1="0" y1="0" x2="1" y2="0">
          {ARCO.map((c, i) => (
            <Stop key={c} offset={i / (ARCO.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      {linhas.map((l, i) => (
        <SvgText
          key={i}
          x={(W - 40) / 2}
          y={fs * 0.98 + i * lh}
          fontSize={fs}
          fontFamily="Oswald_700Bold"
          textAnchor="middle"
          fill="url(#stnome)"
        >
          {l}
        </SvgText>
      ))}
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

/** Um brilhinho de quatro pontas que pisca devagar (na tela; a captura pega o quadro do momento). */
function Brilho({
  x,
  y,
  r,
  c,
  atraso,
}: {
  x: number;
  y: number;
  r: number;
  c: string;
  atraso: number;
}) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    k.set(
      withDelay(
        atraso,
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
          withRepeat(
            withSequence(
              withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
              withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
          ),
        ),
      ),
    );
  }, [reduce, atraso, k]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.get() * 1.6),
    transform: [{ scale: k.get() }, { rotate: `${(1 - k.get()) * 45}deg` }],
  }));
  const d = r * 2;
  return (
    <Animated.View
      style={[{ position: "absolute", left: x - r, top: y - r, width: d, height: d }, st]}
    >
      <Svg width={d} height={d}>
        <Path
          d={`M${r} 0Q${r} ${r} ${d} ${r}Q${r} ${r} ${r} ${d}Q${r} ${r} 0 ${r}Q${r} ${r} ${r} 0Z`}
          fill={c}
        />
      </Svg>
    </Animated.View>
  );
}

/** Brilhinhos de quatro pontas em volta do cartão de vidro. */
function Brilhos() {
  const pts: [number, number, number, string][] = [
    [62, 268, 9, colors.yellow],
    [302, 250, 7, colors.coral],
    [306, 420, 10, colors.turquoise],
    [54, 432, 6, colors.lilac],
  ];
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, width: W, height: H }}
    >
      {pts.map(([x, y, r, c], i) => (
        <Brilho key={i} x={x} y={y} r={r} c={c} atraso={500 + i * 160} />
      ))}
    </View>
  );
}

/**
 * O objeto em destaque: a imagem 3D solta no vidro, ou o desenho quando não há imagem. Na tela
 * entra crescendo de leve e depois flutua devagar.
 */
function Destaque({ c }: { c: Compartilhavel }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  const f = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    k.set(withDelay(260, withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.4)) })));
    f.set(
      withDelay(
        900,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      ),
    );
  }, [reduce, k, f]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, k.get() * 1.5),
    transform: [
      { translateY: (1 - k.get()) * 14 - f.get() * 5 },
      { scale: 0.82 + 0.18 * k.get() },
      { rotate: `${(f.get() - 0.5) * 3}deg` },
    ],
  }));
  let corpo;
  if (c.tipo === "medalha") {
    const img = MEDALHA_IMG[c.id];
    corpo = img ? (
      <Image source={img} style={{ width: 196, height: 196 }} resizeMode="contain" />
    ) : (
      <MedalView id={c.id} size={190} on banho={c.banho ?? null} />
    );
  } else corpo = <NivelIcone k={c.k} size={NIVEL_IMG[c.k] ? 196 : 170} />;
  return <Animated.View style={st}>{corpo}</Animated.View>;
}

/**
 * O cartão em si, no tamanho lógico 360 × 640 (a captura sai em 1080 × 1920). Coluna centralizada
 * fora das faixas que o Instagram cobre; a assinatura fica a 40 (120 em 1080) do fundo, como nos
 * stories da marca.
 */
function Cartao({ c, forma }: { c: Compartilhavel; forma: number }) {
  const medalha = c.tipo === "medalha" ? getMedalha(c.id) : null;
  const nivel = c.tipo === "nivel" ? NIVEIS_EVO[c.k] : null;
  const eyebrow = medalha
    ? "Conquista na Irisa"
    : nivel && c.tipo === "nivel"
      ? `Nível ${c.k + 1} de 8`
      : "";
  const leve = medalha ? "Desbloqueei" : "Agora sou";
  const nome = medalha ? nomeDa(medalha, forma) : nivel ? nomeNivel(nivel, forma) : "";
  const frase = medalha ? medalha.copy : (nivel?.t ?? "");
  return (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      <Fundo />
      <Brilhos />
      <View
        style={{
          flex: 1,
          paddingTop: 66,
          paddingBottom: 84,
          paddingHorizontal: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          className="font-body-bold uppercase"
          style={{ fontSize: 10.5, letterSpacing: 1.6, color: "#0A8B7A" }}
        >
          {eyebrow}
        </Text>
        <Text
          className="mt-2 font-heading uppercase text-ink"
          style={{ fontSize: 26, lineHeight: 30, letterSpacing: 0.3 }}
        >
          {leve}
        </Text>
        <NomeArcoIris nome={nome} />
        <View
          style={{
            marginTop: 14,
            width: 236,
            height: 236,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.62)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.9)",
            boxShadow: "0 2px 4px rgba(20,24,41,0.04), 0 18px 40px rgba(20,24,41,0.10)",
          }}
        >
          <Destaque c={c} />
        </View>
        <Text
          className="text-center font-body"
          style={{
            fontSize: 14.5,
            lineHeight: 20,
            color: colors.muted,
            marginTop: 16,
            maxWidth: 280,
          }}
          numberOfLines={3}
        >
          {medalha ? `“${frase}”` : frase}
        </Text>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <RadarMin size={16} />
        <Text
          className="font-wordmark uppercase text-ink"
          style={{ fontSize: 12.5, letterSpacing: 2.5 }}
        >
          Iris<Text style={{ color: colors.amber }}>a</Text>
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
