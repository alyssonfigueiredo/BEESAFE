import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePostSupportMessage, type WeeklyQuestion } from "@/hooks/useSupport";
import { authMessage } from "@/lib/authErrors";
import type { SupportCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

import { RainbowAvatar } from "./Avatar";
import { CATEGORY_ORDER, NOTE_TINT, PARECE_RELATO, SUGGESTIONS } from "./theme";

const MAX = 1000;

export type ComposeRequest = {
  category: SupportCategory;
  /** Pergunta da semana que o recado responde (o id vai em support_messages.prompt). */
  question?: WeeklyQuestion | null;
};

/** Folha de escrever no mural. Remonta a cada abertura (o Modal fechado não guarda filhos). */
export function ComposerSheet({
  request,
  nickname,
  cityId,
  onClose,
  onPosted,
}: {
  request: ComposeRequest | null;
  nickname: string;
  cityId?: number;
  onClose: () => void;
  onPosted: () => void;
}) {
  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={onClose}>
      {request && (
        <SheetBody
          request={request}
          nickname={nickname}
          cityId={cityId}
          onClose={onClose}
          onPosted={onPosted}
        />
      )}
    </Modal>
  );
}

function SheetBody({
  request,
  nickname,
  cityId,
  onClose,
  onPosted,
}: {
  request: ComposeRequest;
  nickname: string;
  cityId?: number;
  onClose: () => void;
  onPosted: () => void;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const safe = useSafeAreaInsets();
  const post = usePostSupportMessage();
  const [category, setCategory] = useState(request.category);
  const [question, setQuestion] = useState(request.question ?? null);
  const [text, setText] = useState("");
  // Pedido de ajuda liga o anônimo sozinho; as outras categorias começam com o apelido.
  const [anon, setAnon] = useState(request.category === "pedido_ajuda");
  const [relatoOk, setRelatoOk] = useState(false);
  const [focused, setFocused] = useState(false);

  const hasNick = !!nickname.trim();
  const showsAnon = anon || !hasNick;
  const pareceRelato = !relatoOk && PARECE_RELATO.test(text);

  function pickCategory(k: SupportCategory) {
    setCategory(k);
    setAnon(k === "pedido_ajuda");
  }

  function virarRelato() {
    const texto = text.trim();
    onClose();
    router.push({ pathname: "/registrar", params: { texto } });
  }

  async function submit() {
    if (!text.trim()) return Alert.alert("Escreva a mensagem.");
    try {
      await post.mutateAsync({
        nickname,
        category,
        content: text,
        cityId,
        anonymous: anon,
        prompt: question?.id ?? null,
      });
      onPosted();
      onClose();
    } catch (e) {
      Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(20,24,41,0.38)" }}
        onPress={onClose}
        accessibilityLabel="Fechar"
      />
      <Animated.View
        entering={reduce ? undefined : SlideInDown.duration(420).easing(Easing.out(Easing.cubic))}
        className="rounded-t-[34px]"
        style={{ backgroundColor: "#FBFAF8", maxHeight: "90%" }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 12,
            paddingBottom: Math.max(safe.bottom, 16) + 16,
            gap: 14,
          }}
        >
          <View
            className="h-[5px] w-11 self-center rounded-full"
            style={{ backgroundColor: "#D3DBE6" }}
          />

          <View className="flex-row items-center gap-4">
            <RainbowAvatar name={showsAnon ? "Anônimo" : nickname} size={44} />
            <View className="min-w-0 flex-1">
              <Text className="font-display text-[22px] uppercase leading-[25px] text-ink">
                Para a comunidade
              </Text>
              <Text className="mt-1 font-body text-sm leading-5 text-muted">
                {showsAnon ? (
                  <>
                    Aparece como <Text className="font-body-bold text-ink">Anônimo</Text>
                    {hasNick ? ", sem apelido." : ". Dá para pôr um apelido no Perfil."}
                  </>
                ) : (
                  <>
                    Aparece como <Text className="font-body-bold text-ink">{nickname.trim()}</Text>,
                    nunca seu nome ou e-mail.
                  </>
                )}
              </Text>
            </View>
          </View>

          {question && (
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3 py-2.5"
              style={{ backgroundColor: colors.lilac + "2E" }}
            >
              <View className="min-w-0 flex-1">
                <Text className="font-body-bold text-[11px] uppercase tracking-[1.4px] text-lilacInk">
                  Respondendo à pergunta da semana
                </Text>
                <Text className="font-body-medium text-[13px] text-ink" numberOfLines={2}>
                  {question.texto}
                </Text>
              </View>
              <Pressable
                onPress={() => setQuestion(null)}
                hitSlop={10}
                accessibilityLabel="Não responder à pergunta"
              >
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}

          <View className="flex-row gap-1.5">
            {CATEGORY_ORDER.map((k) => {
              const on = k === category;
              const t = NOTE_TINT[k];
              return (
                <Pressable
                  key={k}
                  onPress={() => pickCategory(k)}
                  className="h-[38px] min-w-0 flex-1 items-center justify-center rounded-full px-2"
                  style={{ backgroundColor: on ? t.paper : colors.subtle }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    className="text-center font-body-bold text-[13px]"
                    style={{ color: on ? t.ink : colors.muted }}
                    numberOfLines={1}
                  >
                    {t.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="font-body-bold text-xs uppercase tracking-[1.6px] text-dim">
            Para começar
          </Text>
          <View className="-mt-1 flex-row flex-wrap gap-1.5">
            {SUGGESTIONS[category].map((s) => (
              <Pressable
                key={s}
                onPress={() => setText(s.replace("…", " "))}
                className="h-8 justify-center rounded-full px-3 active:opacity-70"
                style={{ backgroundColor: colors.subtle }}
              >
                <Text className="font-body-medium text-[12.5px] text-ink">{s}</Text>
              </Pressable>
            ))}
          </View>

          <View>
            <TextInput
              className="rounded-[18px] bg-solid px-3.5 py-3 font-body text-[15px] leading-[21px] text-ink"
              style={[
                { minHeight: 110 },
                { borderWidth: 1.5, borderColor: focused ? colors.turquoise : colors.border },
              ]}
              placeholder="Escreva aqui (até 1000 caracteres)"
              placeholderTextColor={colors.dim}
              multiline
              textAlignVertical="top"
              maxLength={MAX}
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <Text className="mt-1 self-end font-body text-[11px] text-dim">
              {text.length}/{MAX}
            </Text>
          </View>

          {pareceRelato && (
            <Animated.View
              entering={reduce ? undefined : FadeIn.duration(250)}
              className="gap-2 rounded-2xl px-3.5 py-3"
              style={{ backgroundColor: "#FFE1DF" }}
            >
              <Text className="font-body text-[13px] leading-[18px] text-muted">
                <Text className="font-body-bold text-coralInk">Isso parece um relato.</Text>{" "}
                {showsAnon ? "No mural ele fica só aqui." : "No mural ele fica com o seu apelido."}{" "}
                Como relato, fica anônimo e vira aviso no mapa.
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={virarRelato}
                  className="h-[34px] items-center justify-center rounded-full bg-coral px-3.5 active:opacity-80"
                >
                  <Text className="font-body-bold text-[12.5px] text-night">Virar relato</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRelatoOk(true)}
                  className="h-[34px] items-center justify-center rounded-full bg-solid px-3.5 active:opacity-80"
                >
                  <Text className="font-body-bold text-[12.5px] text-ink">Publicar assim</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-solid px-3 py-2.5">
            <Text className="min-w-0 flex-1 font-body text-[13px] leading-[18px] text-muted">
              <Text className="font-body-bold text-ink">Publicar como Anônimo</Text>
              {"\n"}Sem apelido. Ligado sozinho em pedido de ajuda.
            </Text>
            <Toggle value={anon} onChange={setAnon} label="Publicar como Anônimo" />
          </View>

          <Text className="font-body text-[11.5px] leading-4 text-dim">
            Não coloque telefone, endereço, nome completo nem foto de outra pessoa. Para falar de um
            lugar, avalie o lugar.
          </Text>

          <Pressable
            disabled={post.isPending}
            onPress={submit}
            className="h-[52px] items-center justify-center rounded-full bg-turquoise active:opacity-80 disabled:opacity-50"
            style={shadow.turquoise}
          >
            <Text className="font-body-bold text-base text-night">
              {post.isPending ? "Publicando…" : "Publicar no mural"}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(reduce ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 250 }));
  }, [value, reduce, p]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 18 }] }));
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      className="h-7 w-[46px] rounded-full"
      style={{ backgroundColor: value ? colors.turquoise : colors.border }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 3,
            left: 3,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(20,24,41,0.2)",
          },
          knob,
        ]}
      />
    </Pressable>
  );
}
