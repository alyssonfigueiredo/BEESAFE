import { Sparkles, X, Send } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { PlaceCard } from "@/components/PlaceCard";
import { routeIrise, type IriseIntent } from "@/lib/iriseRouter";
import { useIriseIntent, useIriseNear, useIriseSuggest } from "@/hooks/useIrise";
import type { WelcomingPlace } from "@/lib/types";
import type { PlaceCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

/**
 * Irise: assistente de descoberta em chat, sem personagem. Três camadas, sempre nesta ordem:
 * 1) chips e o roteador de `iriseRouter.ts`, sem IA; 2) só quando o texto livre não casa com
 * nada, a Edge Function irise-intent (Groq/Gemini) devolve a intenção; 3) quem busca de verdade
 * é `irise_suggest_places`/`places_near`, no banco — a Irise nunca inventa lugar, nota ou endereço.
 */

type LogItem =
  | { kind: "bubble"; id: string; text: string; mine?: boolean }
  | { kind: "chips"; id: string; options: { label: string; onPick: () => void }[] }
  | { kind: "badge"; id: string; label: string }
  | { kind: "typing"; id: string }
  | { kind: "results"; id: string; places: WelcomingPlace[] }
  | { kind: "empty"; id: string; text: string };

const INTENCAO_CHIPS: { label: string; categories: PlaceCategory[] | null }[] = [
  { label: "🍽️ Comer", categories: ["restaurante"] },
  { label: "🍸 Beber", categories: ["bar"] },
  { label: "☕ Café", categories: ["cafe"] },
  { label: "💃 Fervo", categories: ["balada"] },
];
const DATE_CHIPS = ["Romântico", "Casual", "Baratinho", "Tranquilo", "Me surpreende"];

export function IriseFab({
  cityId,
  cityName,
  userLocation,
}: {
  cityId: number | undefined;
  cityName: string | undefined;
  userLocation: { lat: number; lng: number } | null;
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setAberta(true)}
        accessibilityLabel="Irise, assistente de descoberta"
        style={{
          position: "absolute",
          right: 18,
          bottom: 100,
          width: 54,
          height: 54,
          borderRadius: 27,
        }}
      >
        <AnelArcoIris />
        <View
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: 24,
            backgroundColor: colors.night,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles color="#fff" size={20} strokeWidth={2.2} />
        </View>
      </Pressable>
      <IriseSheet
        visible={aberta}
        onClose={() => setAberta(false)}
        cityId={cityId}
        cityName={cityName}
        userLocation={userLocation}
      />
    </>
  );
}

/** Anel em arco-íris (o mesmo gradiente da marca) — usado no botão flutuante e no título da folha. */
function AnelArcoIris({ size = 54 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 54 54">
      <Defs>
        <LinearGradient id="irisering" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.coral} />
          <Stop offset="0.25" stopColor={colors.yellow} />
          <Stop offset="0.5" stopColor={colors.turquoise} />
          <Stop offset="0.75" stopColor="#59A7FF" />
          <Stop offset="1" stopColor={colors.lilac} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={54} height={54} rx={27} fill="url(#irisering)" />
    </Svg>
  );
}

function Bubble({ text, mine }: { text: string; mine?: boolean }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={{ alignSelf: mine ? "flex-end" : "flex-start" }}>
      <View
        className={mine ? "bg-night" : "bg-solid"}
        style={[
          { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
          mine ? { borderBottomRightRadius: 5 } : { borderBottomLeftRadius: 5 },
          shadow.card,
        ]}
      >
        <Text className={mine ? "font-body text-[14px] text-paper" : "font-body text-[14px] text-ink"}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

function ChipsRow({ options }: { options: { label: string; onPick: () => void }[] }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Pressable
          key={o.label}
          onPress={o.onPick}
          className="h-[38px] items-center justify-center rounded-full bg-subtle px-4 active:opacity-70"
        >
          <Text className="font-body-bold text-[13.5px] text-ink">{o.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

function BadgeLayer({ label }: { label: string }) {
  const zeroIa = label === "Zero IA";
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View
        className="self-start rounded-[10px] px-2.5 py-1"
        style={{ backgroundColor: zeroIa ? "rgba(73,220,192,0.18)" : "rgba(255,208,102,0.3)" }}
      >
        <Text
          className="font-body-bold text-[10px] uppercase tracking-wider"
          style={{ color: zeroIa ? colors.turquoiseInk : colors.yellowInk }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

function TypingDots() {
  return (
    <Animated.View entering={FadeInDown.duration(200)} className="self-start">
      <View className="flex-row gap-1 rounded-2xl bg-solid px-4 py-3" style={shadow.card}>
        <Text className="font-body text-[14px] text-dim">···</Text>
      </View>
    </Animated.View>
  );
}

let seq = 0;
const uid = () => `l${seq++}`;

function IriseSheet({
  visible,
  onClose,
  cityId,
  cityName,
  userLocation,
}: {
  visible: boolean;
  onClose: () => void;
  cityId: number | undefined;
  cityName: string | undefined;
  userLocation: { lat: number; lng: number } | null;
}) {
  const { height } = useWindowDimensions();
  const [log, setLog] = useState<LogItem[]>([]);
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const suggest = useIriseSuggest();
  const near = useIriseNear();
  const intentAI = useIriseIntent();

  function push(item: LogItem) {
    setLog((l) => [...l, item]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }
  function remove(id: string) {
    setLog((l) => l.filter((i) => i.id !== id));
  }
  const addBubble = (text: string, mine?: boolean) => push({ kind: "bubble", id: uid(), text, mine });
  const addBadge = (label: string) => push({ kind: "badge", id: uid(), label });
  const addChips = (options: { label: string; onPick: () => void }[]) =>
    push({ kind: "chips", id: uid(), options });

  async function withTyping(run: () => Promise<void>) {
    const typingId = uid();
    push({ kind: "typing", id: typingId });
    try {
      await run();
    } finally {
      remove(typingId);
    }
  }

  async function mostrarResultados(categories: PlaceCategory[] | null, semNota: boolean) {
    if (!cityId) {
      addBubble("Ainda não sei sua cidade — escolha uma no Início antes de pedir pra mim.");
      return;
    }
    const places = await suggest.mutateAsync({ cityId, categories, semNota });
    if (places.length === 0) {
      push({
        kind: "empty",
        id: uid(),
        text: semNota
          ? "Todo lugar daqui já tem alguma avaliação — você chegou tarde, parabéns pela comunidade."
          : "Ainda não tem lugar assim na sua cidade. Topa ser quem avalia o primeiro?",
      });
    } else {
      push({ kind: "results", id: uid(), places });
    }
  }

  async function mostrarPerto() {
    if (!userLocation) {
      addBubble("Preciso da sua localização pra isso — ative o GPS e tente de novo.");
      return;
    }
    const places = await near.mutateAsync(userLocation);
    if (places.length === 0) {
      push({ kind: "empty", id: uid(), text: "Não achei nenhum lugar avaliado perto de você ainda." });
    } else {
      push({ kind: "results", id: uid(), places });
    }
  }

  async function runIntent(intent: IriseIntent, badge: string) {
    addBadge(badge);
    await withTyping(async () => {
      addBubble(intent.mensagem);
      if (intent.perto) await mostrarPerto();
      else await mostrarResultados(intent.categories, intent.semNota);
    });
    addAgain();
  }

  function addAgain() {
    push({
      kind: "chips",
      id: uid(),
      options: [{ label: "Quer procurar outra coisa?", onPick: flowIntro }],
    });
  }

  function flowDate() {
    addBubble("Tá, temos um date 👀 Qual a energia?");
    addChips(
      DATE_CHIPS.map((d) => ({
        label: d,
        onPick: () => {
          addBubble(d, true);
          void runIntent(
            { categories: ["bar", "restaurante", "cafe"], semNota: false, perto: false, mensagem: "Peguei a vibe. Separei esses pra você:" },
            "Zero IA",
          );
        },
      })),
    );
  }

  function flowIntencao() {
    addBubble("Qual a intenção?");
    addChips([
      ...INTENCAO_CHIPS.map((c) => ({
        label: c.label,
        onPick: () => {
          addBubble(c.label, true);
          void runIntent(
            { categories: c.categories, semNota: false, perto: false, mensagem: `Separei esses pra você:` },
            "Zero IA",
          );
        },
      })),
      {
        label: "💘 Date",
        onPick: () => {
          addBubble("💘 Date", true);
          flowDate();
        },
      },
    ]);
  }

  function flowIntro() {
    addBubble("E aí, qual vai ser hoje? 🌈");
    addChips([
      {
        label: "Quero um lugar",
        onPick: () => {
          addBubble("Quero um lugar", true);
          flowIntencao();
        },
      },
      {
        label: "Quero irisar",
        onPick: () => {
          addBubble("Quero irisar", true);
          void runIntent(
            {
              categories: null,
              semNota: true,
              perto: false,
              mensagem: "Esses aqui a comunidade quase não irisou ainda — topa ser quem conta como é?",
            },
            "Zero IA",
          );
        },
      },
      {
        label: "Me surpreende",
        onPick: () => {
          addBubble("Me surpreende", true);
          void runIntent(
            { categories: null, semNota: false, perto: false, mensagem: "Ah, deixa comigo então." },
            "Zero IA",
          );
        },
      },
      {
        label: "O que tem por perto?",
        onPick: () => {
          addBubble("O que tem por perto?", true);
          void runIntent(
            { categories: null, semNota: false, perto: true, mensagem: "Pelo que vejo daqui, perto de você:" },
            "Zero IA",
          );
        },
      },
    ]);
  }

  async function handleFreeText() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    addBubble(t, true);
    const roteada = routeIrise(t);
    if (roteada) {
      await runIntent(roteada, "Zero IA");
      return;
    }
    await withTyping(async () => {
      try {
        const { intent, provider } = await intentAI.mutateAsync({ texto: t, cidade: cityName ?? "sua cidade" });
        addBadge(provider === "gemini" ? "Gemini interpretou" : "Groq interpretou");
        addBubble(intent.mensagem);
        await mostrarResultados(intent.categories, intent.semNota);
        addAgain();
      } catch {
        addBubble("Não consegui entender agora — escolhe um dos botões abaixo. ✨");
        flowIntro();
      }
    });
  }

  function onOpen() {
    if (log.length === 0) flowIntro();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={onOpen} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,24,41,0.4)" }} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: height * 0.86 }}
      >
        <View
          className="bg-solid"
          style={{ borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: "hidden" }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "#D9D5CD", alignSelf: "center", marginTop: 10 }} />
          <View className="flex-row items-center justify-between border-b border-border px-[18px] pb-3 pt-2">
            <View className="flex-row items-center gap-2">
              <AnelArcoIris size={22} />
              <Text className="font-body-bold text-[15px] text-ink">Irise</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} className="h-[30px] w-[30px] items-center justify-center rounded-full bg-subtle">
              <X size={14} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: height * 0.62 }}
            contentContainerStyle={{ padding: 18, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {log.map((item) => {
              if (item.kind === "bubble") return <Bubble key={item.id} text={item.text} mine={item.mine} />;
              if (item.kind === "chips") return <ChipsRow key={item.id} options={item.options} />;
              if (item.kind === "badge") return <BadgeLayer key={item.id} label={item.label} />;
              if (item.kind === "typing") return <TypingDots key={item.id} />;
              if (item.kind === "empty") return <Bubble key={item.id} text={item.text} />;
              return (
                <View key={item.id} style={{ gap: 10 }}>
                  {item.places.map((p, i) => (
                    <PlaceCard key={p.id} place={p} index={i} />
                  ))}
                </View>
              );
            })}
          </ScrollView>
          <View className="gap-2 border-t border-border px-[14px] pb-[max(14px,env(safe-area-inset-bottom))] pt-[10px]">
            <View className="h-[46px] flex-row items-center gap-2 rounded-full bg-subtle pl-4 pr-1.5">
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Ou me conta o que você tá procurando…"
                placeholderTextColor={colors.dim}
                className="flex-1 font-body text-[13.5px] text-ink"
                onSubmitEditing={() => void handleFreeText()}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => void handleFreeText()}
                className="h-9 w-9 items-center justify-center rounded-full bg-night active:opacity-80"
              >
                <Send size={15} color="#fff" strokeWidth={2.3} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
