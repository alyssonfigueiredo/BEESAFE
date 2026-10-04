import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Aurora } from "@/components/Aurora";
import { Chip } from "@/components/Chip";
import { ComposerCard } from "@/components/mural/ComposerCard";
import { ComposerSheet, type ComposeRequest } from "@/components/mural/ComposerSheet";
import { NoteCard } from "@/components/mural/NoteCard";
import { Segmented } from "@/components/Segmented";
import { ServicesPanel } from "@/components/mural/ServicesPanel";
import { WeeklyQuestion } from "@/components/mural/WeeklyQuestion";
import { useProfile } from "@/hooks/useProfile";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  useReactSupport,
  useSupportMessages,
  useSupportServices,
  useWeeklyQuestion,
  useWeekMessageCount,
} from "@/hooks/useSupport";
import { useCity } from "@/providers/CityProvider";
import type { SupportCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

type Tab = "mural" | "servicos";
type Filter = "all" | SupportCategory;

const TABS = [
  { key: "mural", label: "Mural" },
  { key: "servicos", label: "Serviços" },
] as const;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "pedido_ajuda", label: "Pedidos de ajuda" },
  { key: "acolhimento", label: "Acolhimento" },
  { key: "dica", label: "Dicas" },
];

function rise(i: number, reduce: boolean) {
  return reduce
    ? undefined
    : FadeInDown.duration(420)
        .delay(i * 80)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
}

export default function ApoioScreen() {
  const insets = useScreenInsets();
  const reduce = useReducedMotion();
  const { city } = useCity();
  const { data: messages = [], isSuccess } = useSupportMessages();
  const { data: weekCount } = useWeekMessageCount();
  const { data: weekly } = useWeeklyQuestion();
  const { data: services = [] } = useSupportServices(city?.id);
  const { data: profile } = useProfile();
  const react = useReactSupport();
  const nickname = profile?.nickname?.trim() ?? "";

  const scroll = useRef<ScrollView>(null);
  const [wallY, setWallY] = useState(0);
  const [tab, setTab] = useState<Tab>("mural");
  const [filter, setFilter] = useState<Filter>("all");
  const [trayFor, setTrayFor] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  // Ids que já estavam no mural quando a pessoa publicou: o recado dela que não está aqui é o
  // novo, e é ele que desce do topo.
  const [before, setBefore] = useState<Set<string> | null>(null);
  const freshId = before ? messages.find((m) => m.is_mine && !before.has(m.id))?.id : undefined;

  const shown = messages.filter((m) => filter === "all" || m.category === filter);

  function seeServices() {
    setTab("servicos");
    setTrayFor(null);
    scroll.current?.scrollTo({ y: 0, animated: !reduce });
  }

  function posted() {
    setBefore(new Set(messages.map((m) => m.id)));
    setFilter("all");
    setTrayFor(null);
    scroll.current?.scrollTo({ y: Math.max(0, wallY - insets.paddingTop), animated: !reduce });
  }

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName="gap-3 px-4"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-display text-2xl uppercase tracking-wide text-ink">Apoio</Text>
            <Text className="font-body text-sm text-muted">
              A comunidade da Irisa, junta
            </Text>
          </View>
          {weekCount != null && weekCount > 0 && (
            <View
              className="h-[30px] justify-center rounded-full px-3"
              style={{ backgroundColor: colors.lilac + "2E" }}
            >
              <Text className="font-body-bold text-[12.5px] text-lilacInk">
                {weekCount} {weekCount === 1 ? "recado" : "recados"} esta semana
              </Text>
            </View>
          )}
        </View>

        <Segmented
          options={TABS}
          value={tab}
          onChange={(t) => {
            setTab(t);
            setTrayFor(null);
          }}
        />

        {tab === "mural" ? (
          <>
            {weekly?.pergunta && (
              <Animated.View entering={rise(1, reduce)}>
                <WeeklyQuestion
                  question={weekly.pergunta}
                  answers={weekly.respostas}
                  onAnswer={() =>
                    setCompose({ category: "acolhimento", question: weekly.pergunta })
                  }
                />
              </Animated.View>
            )}

            <Animated.View entering={rise(2, reduce)}>
              <ComposerCard nickname={nickname} onOpen={(category) => setCompose({ category })} />
            </Animated.View>

            <Animated.View
              entering={rise(3, reduce)}
              onLayout={(e) => setWallY(e.nativeEvent.layout.y)}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-1.5"
                className="-mx-4"
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    label={f.label}
                    active={filter === f.key}
                    onPress={() => {
                      setFilter(f.key);
                      setTrayFor(null);
                    }}
                  />
                ))}
              </ScrollView>
            </Animated.View>

            {isSuccess && messages.length === 0 ? (
              <EmptyWall hasQuestion={!!weekly?.pergunta} />
            ) : isSuccess && shown.length === 0 ? (
              <Text className="px-1 py-4 text-center font-body text-sm text-muted">
                Nada aqui por enquanto. Que tal ser a primeira pessoa?
              </Text>
            ) : (
              <View className="gap-3.5 pt-2">
                {shown.map((m, i) => (
                  <NoteCard
                    key={m.id}
                    message={m}
                    index={i}
                    fresh={m.id === freshId}
                    trayOpen={trayFor === m.id}
                    onToggleTray={() => setTrayFor((v) => (v === m.id ? null : m.id))}
                    onReact={(kind) => {
                      react.mutate({ id: m.id, kind });
                      setTrayFor(null);
                    }}
                    onSeeServices={seeServices}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <ServicesPanel services={services} cityName={city?.name} />
        )}
      </ScrollView>

      <ComposerSheet
        request={compose}
        nickname={nickname}
        cityId={city?.id}
        onClose={() => setCompose(null)}
        onPosted={posted}
      />
    </View>
  );
}

function EmptyWall({ hasQuestion }: { hasQuestion: boolean }) {
  return (
    <View className="items-center gap-1.5 rounded-3xl bg-surface px-5 py-6">
      <Text className="text-center font-display text-xl uppercase text-ink">
        O mural está esperando
      </Text>
      <Text className="text-center font-body text-sm leading-5 text-muted">
        {hasQuestion ? "Responda a pergunta da semana ou toque" : "Toque"} em um dos botões acima:
        mande um abraço, dê uma dica ou peça ajuda. O primeiro recado puxa os outros.
      </Text>
    </View>
  );
}
