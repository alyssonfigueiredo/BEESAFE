import { HeartHandshake, MapPin, Siren } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeInDown, ZoomIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Aurora } from "@/components/Aurora";
import { Mark } from "@/components/Mark";
import { Rainbow } from "@/components/Rainbow";
import { MedalView } from "@/components/gami/MedalView";
import { SliceRing } from "@/components/gami/Rings";
import { fecharTour } from "@/hooks/useTour";
import { AXES, AXIS_KEYS, EMERGENCY_CONTACTS } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

// Seis telas deslizáveis no primeiro acesso. Cada tela anima quando aparece pela primeira vez.

function Entra({ i, children }: { i: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View entering={reduce ? undefined : FadeInDown.duration(480).delay(120 + i * 110)}>
      {children}
    </Animated.View>
  );
}

function Titulo({ children, sub }: { children: ReactNode; sub: string }) {
  return (
    <>
      <Entra i={1}>
        <Text className="text-center font-display text-[34px] uppercase leading-[38px] text-ink">
          {children}
        </Text>
      </Entra>
      <Entra i={2}>
        <Text className="mt-3 text-center font-body text-[16px] leading-[23px] text-muted">
          {sub}
        </Text>
      </Entra>
    </>
  );
}

function Pop({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View
      entering={reduce ? undefined : ZoomIn.springify().damping(13)}
      className="mb-7 items-center"
    >
      {children}
    </Animated.View>
  );
}

const NOTAS = [4.6, 5, 3.4, 4.2];

const TELAS: (() => ReactNode)[] = [
  () => (
    <>
      <Pop>
        <Mark size={150} />
      </Pop>
      <Titulo sub="O mapa dos lugares onde a gente é bem-vinde, feito por nós.">
        Bem-vinde à Irisa
      </Titulo>
    </>
  ),
  () => (
    <>
      <Pop>
        <View className="w-[290px] gap-3 rounded-3xl bg-surface p-5" style={shadow.card}>
          {AXIS_KEYS.map((k, i) => (
            <View key={k} className="flex-row items-center justify-between gap-3">
              <Text className="font-body-medium text-[14px] text-ink">{AXES[k].label}</Text>
              <Rainbow value={NOTAS[i]} size={9} />
            </View>
          ))}
        </View>
      </Pop>
      <Titulo sub="Quatro perguntas sobre como você foi recebide: atendimento, afeto, banheiro e clientela. Leva um minuto. Com 5 avaliações, o lugar ganha selo.">
        Quanta cor tem esse lugar?
      </Titulo>
    </>
  ),
  () => (
    <>
      <Pop>
        <View
          className="w-[290px] gap-2 rounded-3xl p-5"
          style={[{ backgroundColor: colors.night }, shadow.lift]}
        >
          <View className="flex-row items-center gap-2">
            <MapPin color={colors.coral} size={18} />
            <Text className="font-body-bold text-[13px] uppercase tracking-wider text-coral">
              Relato
            </Text>
          </View>
          <Text className="font-display text-[26px] uppercase leading-[30px] text-paper">
            Sem nome.{"\n"}Sem perfil.{"\n"}Sem rastro.
          </Text>
        </View>
      </Pop>
      <Titulo sub="Se algo aconteceu, registre sem se identificar. O lugar recebe cor, a rua recebe aviso: o relato aparece no mapa como área de atenção.">
        Registrar relato
      </Titulo>
    </>
  ),
  () => (
    <>
      <Pop>
        <View
          className="h-[120px] w-[120px] items-center justify-center rounded-full"
          style={[{ backgroundColor: colors.coral }, shadow.lift]}
        >
          <Siren color="#fff" size={56} strokeWidth={1.8} />
        </View>
      </Pop>
      <Titulo sub="O botão vermelho no topo de toda tela liga direto para quem pode ajudar.">
        Emergência
      </Titulo>
      <Entra i={3}>
        <View className="mt-5 flex-row flex-wrap justify-center gap-2">
          {EMERGENCY_CONTACTS.map((c) => (
            <View
              key={c.number}
              className="flex-row items-baseline gap-1.5 rounded-full bg-subtle px-3.5 py-2"
            >
              <Text className="font-body-bold text-[15px] text-ink">{c.number}</Text>
              <Text className="font-body text-[13px] text-muted">{c.name}</Text>
            </View>
          ))}
        </View>
      </Entra>
    </>
  ),
  () => (
    <>
      <Pop>
        <View
          className="h-[120px] w-[120px] items-center justify-center rounded-full"
          style={[{ backgroundColor: colors.lilac }, shadow.lift]}
        >
          <HeartHandshake color="#fff" size={56} strokeWidth={1.8} />
        </View>
      </Pop>
      <Titulo sub="Na aba Apoio ficam o mural, com mensagens da comunidade, e os serviços de acolhimento da sua cidade.">
        Você não está só
      </Titulo>
    </>
  ),
  () => (
    <>
      <Pop>
        <View className="flex-row items-center gap-3">
          <SliceRing lit={20} size={110} />
          <View className="gap-2">
            <MedalView id="deu-o-nome" size={56} />
            <MedalView id="inaugurou" size={56} on={false} prog={0.6} lockIcon={false} />
          </View>
        </View>
      </Pop>
      <Titulo sub="Avaliar acende gomos no seu anel, até 4 por semana, e libera conquistas. Só você vê. Relato nunca conta ponto.">
        Suas conquistas
      </Titulo>
    </>
  ),
];

export function Tour({ visible }: { visible: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const [atual, setAtual] = useState(0);
  const [altura, setAltura] = useState(0);
  const [vistas, setVistas] = useState<Set<number>>(() => new Set([0]));
  const ultima = atual === TELAS.length - 1;

  function irPara(i: number) {
    ref.current?.scrollTo({ x: i * width, animated: true });
    marcar(i);
  }
  function marcar(i: number) {
    setAtual(i);
    setVistas((v) => (v.has(i) ? v : new Set(v).add(i)));
  }
  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    marcar(Math.round(e.nativeEvent.contentOffset.x / width));
  }
  function fechar() {
    fecharTour();
    setAtual(0);
    setVistas(new Set([0]));
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={fechar} statusBarTranslucent>
      <View className="flex-1">
        <Aurora />
        <View
          className="flex-row justify-end px-5"
          style={{ paddingTop: insets.top + 8, minHeight: insets.top + 52 }}
        >
          {!ultima && (
            <Pressable onPress={fechar} hitSlop={12} className="rounded-full bg-subtle px-4 py-2">
              <Text className="font-body-bold text-[14px] text-muted">Pular</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onLayout={(e) => setAltura(e.nativeEvent.layout.height)}
          style={{ flex: 1 }}
        >
          {TELAS.map((Tela, i) => (
            <View key={i} style={{ width, height: altura }} className="justify-center px-8">
              {altura > 0 && vistas.has(i) && <Tela />}
            </View>
          ))}
        </ScrollView>
        <View className="gap-5 px-6" style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="flex-row justify-center gap-2">
            {TELAS.map((_, i) => (
              <View
                key={i}
                className="h-2 rounded-full"
                style={{
                  width: i === atual ? 22 : 8,
                  backgroundColor: i === atual ? colors.ink : colors.border,
                }}
              />
            ))}
          </View>
          <Pressable
            onPress={() => (ultima ? fechar() : irPara(atual + 1))}
            className="items-center rounded-full py-4 active:opacity-80"
            style={[{ backgroundColor: ultima ? colors.turquoise : colors.night }, shadow.card]}
          >
            <Text className={`font-body-bold text-[16px] ${ultima ? "text-night" : "text-paper"}`}>
              {ultima ? "Começar" : "Próximo"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
