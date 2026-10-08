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
import { Busto } from "@/components/irise-personagem/Busto";
import { useIriseNear, useIriseOrchestrate, useIriseSuggest, type OrchestratedPlace } from "@/hooks/useIrise";
import { useProfile } from "@/hooks/useProfile";
import type { PlaceCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

/**
 * Irise: um único assistente, sem personagem, sem nome de modelo à vista. Dois caminhos, nunca
 * misturados pra pessoa:
 * - Chips (botões prontos): zero IA, vão direto no banco (`irise_suggest_places`/`places_near`).
 * - Texto livre: vai inteiro pro Irise Orchestrator (Edge Function), que por dentro usa Groq pra
 *   entender/responder e Gemini pra ranquear os lugares reais que o banco achou. A pessoa só vê
 *   "a Irise respondeu" — nunca qual motor foi usado.
 */

type LogItem =
  | { kind: "bubble"; id: string; text: string; mine?: boolean }
  | { kind: "chips"; id: string; options: { label: string; onPick: () => void }[] }
  | { kind: "typing"; id: string }
  | { kind: "results"; id: string; places: OrchestratedPlace[] }
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
  const { data: profile } = useProfile();
  const personagem = profile?.irise_personagem ?? null;
  return (
    <>
      <Pressable
        onPress={() => setAberta(true)}
        accessibilityLabel="Irise, assistente de descoberta"
        style={{ position: "absolute", right: 18, bottom: 100, width: 54, height: 54, borderRadius: 27 }}
      >
        <AnelArcoIris />
        {personagem ? (
          <View style={{ position: "absolute", inset: 3 }}>
            <Busto personagem={personagem} size={48} />
          </View>
        ) : (
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
        )}
      </Pressable>
      <IriseSheet
        visible={aberta}
        onClose={() => setAberta(false)}
        cityId={cityId}
        cityName={cityName}
        userLocation={userLocation}
        personagem={personagem}
      />
    </>
  );
}

/** Anel em arco-íris (o mesmo gradiente da marca) — botão flutuante e título da folha. */
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
  personagem,
}: {
  visible: boolean;
  onClose: () => void;
  cityId: number | undefined;
  cityName: string | undefined;
  userLocation: { lat: number; lng: number } | null;
  personagem: number | null;
}) {
  const { height } = useWindowDimensions();
  const [log, setLog] = useState<LogItem[]>([]);
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const suggest = useIriseSuggest();
  const near = useIriseNear();
  const orchestrate = useIriseOrchestrate();

  function push(item: LogItem) {
    setLog((l) => [...l, item]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }
  function remove(id: string) {
    setLog((l) => l.filter((i) => i.id !== id));
  }
  const addBubble = (text: string, mine?: boolean) => push({ kind: "bubble", id: uid(), text, mine });
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

  // ---------- chips: zero IA, direto no banco ----------
  async function buscarPorChip(categories: PlaceCategory[] | null, semNota: boolean, mensagem: string) {
    await withTyping(async () => {
      addBubble(mensagem);
      if (!cityId) {
        addBubble("Ainda não sei sua cidade — escolha uma no Início antes de pedir pra mim.");
        return;
      }
      const places = await suggest.mutateAsync({ cityId, categories, semNota });
      mostrarOuVazio(
        places.map((p) => ({ ...p, reason: null })),
        semNota,
      );
    });
  }

  async function buscarPerto() {
    await withTyping(async () => {
      addBubble("Pelo que vejo daqui, perto de você:");
      if (!userLocation) {
        addBubble("Preciso da sua localização pra isso — ative o GPS e tente de novo.");
        return;
      }
      const places = await near.mutateAsync(userLocation);
      mostrarOuVazio(
        places.map((p) => ({ ...p, reason: null })),
        false,
      );
    });
  }

  function mostrarOuVazio(places: OrchestratedPlace[], semNota: boolean) {
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

  function flowDate() {
    addBubble("Tá, temos um date 👀 Qual a energia?");
    addChips(
      DATE_CHIPS.map((d) => ({
        label: d,
        onPick: () => {
          addBubble(d, true);
          void buscarPorChip(["bar", "restaurante", "cafe"], false, "Peguei a vibe. Separei esses pra você:");
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
          void buscarPorChip(c.categories, false, "Separei esses pra você:");
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
    addBubble("E aí, qual vai ser hoje? Me conta com suas palavras, ou escolhe uma ideia: 🌈");
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
          void buscarPorChip(
            null,
            true,
            "Esses aqui a comunidade quase não irisou ainda — topa ser quem conta como é?",
          );
        },
      },
      {
        label: "Me surpreende",
        onPick: () => {
          addBubble("Me surpreende", true);
          void buscarPorChip(null, false, "Ah, deixa comigo então.");
        },
      },
      {
        label: "O que tem por perto?",
        onPick: () => {
          addBubble("O que tem por perto?", true);
          void buscarPerto();
        },
      },
    ]);
  }

  // ---------- texto livre: Irise Orchestrator ----------
  async function handleFreeText() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    addBubble(t, true);
    await withTyping(async () => {
      try {
        const { message, places } = await orchestrate.mutateAsync({
          texto: t,
          cidade: cityName ?? "sua cidade",
          cityId,
          perto: userLocation,
        });
        if (message) addBubble(message);
        if (places) mostrarOuVazio(places, false);
      } catch (err) {
        // Mensagem técnica à vista de propósito (nada sensível passa por aqui — nunca a chave em
        // si): sem acesso ao log do Supabase, é o único jeito de saber o que quebrou.
        const detalhe = err instanceof Error ? err.message : String(err);
        addBubble(`Não consegui pensar nisso agora — escolhe um dos botões abaixo. ✨\n\n(${detalhe})`);
        flowIntro();
        return;
      }
    });
  }

  function onOpen() {
    if (log.length === 0) flowIntro();
    // O jeito mais natural de usar isso é digitando — os chips são só um atalho, não a entrada
    // obrigatória. Focar o campo deixa isso claro na hora que a folha abre (04/10/2026).
    setTimeout(() => inputRef.current?.focus(), 260);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={onOpen} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,24,41,0.4)" }} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: height * 0.86 }}
      >
        <View className="bg-solid" style={{ borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: "hidden" }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "#D9D5CD", alignSelf: "center", marginTop: 10 }} />
          <View className="flex-row items-center justify-between border-b border-border px-[18px] pb-3 pt-2">
            <View className="flex-row items-center gap-2.5">
              {personagem ? <Busto personagem={personagem} size={36} /> : <AnelArcoIris size={22} />}
              <Text className="font-body-bold text-[16px] text-ink">Irise</Text>
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
              if (item.kind === "typing") return <TypingDots key={item.id} />;
              if (item.kind === "empty") return <Bubble key={item.id} text={item.text} />;
              return (
                <View key={item.id} style={{ gap: 6 }}>
                  {item.places.map((p, i) => (
                    <View key={p.id} style={{ gap: 4 }}>
                      <PlaceCard place={p} index={i} onPress={onClose} />
                      {!!p.reason && (
                        <Text className="px-1 font-body text-[11.5px]" style={{ color: colors.turquoiseInk }}>
                          {p.reason}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          <View className="gap-2 border-t border-border px-[14px] pb-[max(14px,env(safe-area-inset-bottom))] pt-[10px]">
            <View className="h-[46px] flex-row items-center gap-2 rounded-full bg-subtle pl-4 pr-1.5">
              <TextInput
                ref={inputRef}
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
