import { router, Stack } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn, useReducedMotion } from "react-native-reanimated";

import { Aurora } from "@/components/Aurora";
import { BoxModal } from "@/components/gami/BoxModal";
import { MedalView } from "@/components/gami/MedalView";
import { SliceRing } from "@/components/gami/Rings";
import {
  quaseLa,
  useGamification,
  useSetMedalForm,
  type Gamificacao,
} from "@/hooks/useGamification";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { getMedalha, LANCAMENTO, NIVEIS, nomeDa } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

const FORMAS = [0, 1, 2] as const;

function Detalhe({ id, g, onClose }: { id: string | null; g: Gamificacao; onClose: () => void }) {
  const reduce = useReducedMotion();
  const m = id ? getMedalha(id) : null;
  const p = g.medalhas.find((x) => x.id === id);
  const c = g.conquistadas.find((x) => x.id === id);
  const ok = !!c;
  return (
    <Modal
      visible={!!m}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(20,24,41,0.34)" }}
        onPress={onClose}
      />
      {m && (
        <View
          className="items-center rounded-t-[34px] px-6 pb-10 pt-3"
          style={{ backgroundColor: "#FBFAF8" }}
        >
          <View className="h-[5px] w-11 rounded-full" style={{ backgroundColor: "#D9D5CD" }} />
          <Animated.View
            entering={reduce ? undefined : ZoomIn.springify().delay(150)}
            style={{ marginTop: 22 }}
          >
            <MedalView
              id={m.id}
              size={190}
              on={ok}
              prog={p ? p.valor / p.alvo : 0}
              banho={c?.banho ?? null}
            />
          </Animated.View>
          <Text className="mt-4 text-center font-display text-[36px] uppercase text-ink">
            {nomeDa(m, g.forma)}
          </Text>
          <Text className="mt-1 max-w-[300px] text-center font-body text-[15px] leading-[21px] text-muted">
            {ok ? `“${m.copy}”` : m.cond}
          </Text>
          {!ok && p && p.alvo > 1 && (
            <View className="mt-4 flex-row items-baseline gap-1.5">
              <Text className="font-display text-[44px] text-ink">{p.valor}</Text>
              <Text className="font-body text-[17px] text-dim">de {p.alvo}</Text>
            </View>
          )}
          {ok && c && (
            <Text className="mt-3 font-body text-[13px] text-dim">
              Desbloqueada em {new Date(c.em).toLocaleDateString("pt-BR")}
              {c.banho ? ` · banho ${c.banho === "holo" ? "holográfico" : c.banho}` : ""}
            </Text>
          )}
          {!ok && m.id !== "abre-alas" && (
            <Pressable
              onPress={() => {
                onClose();
                router.push("/lugares");
              }}
              className="mt-5 w-full items-center rounded-full py-3.5 active:opacity-80"
              style={{ backgroundColor: colors.night }}
            >
              <Text className="font-body-bold text-[15px] text-paper">Avaliar um lugar perto</Text>
            </Pressable>
          )}
        </View>
      )}
    </Modal>
  );
}

export default function PulseiraScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: g, isLoading } = useGamification();
  const setForma = useSetMedalForm();
  const [aberta, setAberta] = useState<string | null>(null);
  const [caixa, setCaixa] = useState(false);
  const feitas = new Set((g?.conquistadas ?? []).map((c) => c.id));
  const quase = quaseLa(g);
  const qm = quase ? getMedalha(quase.id) : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Perfil",
          title: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerBlurEffect: "systemUltraThinMaterial",
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4"
          contentContainerStyle={insets}
        >
          <View>
            <Text className="font-display text-[34px] uppercase text-ink">Pulseira</Text>
            <Text className="font-body text-[15px] text-muted">
              {g
                ? `${LANCAMENTO.filter((id) => feitas.has(id)).length} de ${LANCAMENTO.length} desbloqueadas`
                : isLoading
                  ? "Carregando…"
                  : "A pulseira chega na próxima atualização do servidor."}
            </Text>
          </View>

          {g && (
            <>
              <View
                className="flex-row items-center gap-4 rounded-3xl bg-surface p-4"
                style={shadow.card}
              >
                <SliceRing lit={g.gomos} size={86} />
                <View className="flex-1 gap-0.5">
                  <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                    Seu anel
                  </Text>
                  <Text
                    className="font-display text-[26px] uppercase"
                    style={{ color: colors.turquoiseInk }}
                  >
                    {NIVEIS[g.nivel]}
                  </Text>
                  <Text className="font-body text-[13px] text-muted">
                    {g.gomos} de 48 gomos · {g.faiscas.rumo} de 10 faíscas
                  </Text>
                </View>
              </View>

              <View className="gap-2.5 rounded-3xl bg-surface p-4" style={shadow.card}>
                <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                  Como as medalhas te chamam
                </Text>
                <Text className="font-body text-[12.5px] text-dim">
                  Vale para todo título que muda com o gênero. Dá para trocar quando quiser.
                </Text>
                <View className="flex-row gap-1 rounded-2xl bg-subtle p-1">
                  {FORMAS.map((f) => {
                    const on = g.forma === f;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setForma.mutate(f)}
                        className="h-9 flex-1 items-center justify-center rounded-xl"
                        style={on ? [{ backgroundColor: colors.solid }, shadow.field] : undefined}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                      >
                        <Text
                          className={
                            on
                              ? "font-body-bold text-[14px] text-ink"
                              : "font-body text-[14px] text-muted"
                          }
                        >
                          {getMedalha("famosinha")!.flex![f]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {g.caixinhas > 0 && (
                <Pressable
                  onPress={() => setCaixa(true)}
                  className="flex-row items-center gap-3 rounded-3xl p-4"
                  style={[{ backgroundColor: colors.night }, shadow.lift]}
                >
                  <Text className="flex-1 font-body-bold text-[15px] text-paper">
                    {g.caixinhas > 1
                      ? `${g.caixinhas} caixinhas para abrir`
                      : "Uma caixinha para abrir"}
                  </Text>
                  <View className="rounded-full bg-yellow px-4 py-2">
                    <Text className="font-body-bold text-[13px] text-night">Abrir</Text>
                  </View>
                </Pressable>
              )}

              {quase && qm && (
                <Pressable
                  onPress={() => setAberta(quase.id)}
                  className="flex-row items-center gap-3.5 rounded-3xl bg-surface px-4 py-3"
                  style={shadow.card}
                >
                  <MedalView
                    id={quase.id}
                    size={64}
                    on={false}
                    prog={quase.valor / quase.alvo}
                    lockIcon={false}
                  />
                  <View className="flex-1">
                    <Text
                      className="font-body-medium text-[11px] uppercase tracking-wider"
                      style={{ color: colors.coralInk }}
                    >
                      Quase lá
                    </Text>
                    <Text className="font-body-bold text-[16px] text-ink">
                      {nomeDa(qm, g.forma)}
                    </Text>
                    <Text className="font-body text-[13px] text-muted">
                      {quase.valor} de {quase.alvo}
                    </Text>
                  </View>
                  <Text className="font-display text-[22px] text-ink">
                    {Math.round((quase.valor / quase.alvo) * 100)}%
                  </Text>
                </Pressable>
              )}

              <View className="flex-row flex-wrap" style={{ rowGap: 18 }}>
                {LANCAMENTO.map((id, i) => {
                  const m = getMedalha(id)!;
                  const p = g.medalhas.find((x) => x.id === id);
                  const c = g.conquistadas.find((x) => x.id === id);
                  return (
                    <Animated.View
                      key={id}
                      entering={FadeInDown.delay(50 * i).springify()}
                      style={{ width: "33.33%" }}
                    >
                      <Pressable
                        onPress={() => setAberta(id)}
                        className="items-center gap-1.5 px-1"
                      >
                        <MedalView
                          id={id}
                          size={94}
                          on={!!c}
                          prog={p ? p.valor / p.alvo : 0}
                          banho={c?.banho ?? null}
                        />
                        <Text
                          className={`text-center text-[12.5px] leading-[15px] ${c ? "font-body-bold text-ink" : "font-body text-dim"}`}
                        >
                          {nomeDa(m, g.forma)}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
              <Text className="pb-2 text-center font-body text-[12px] text-dim">
                Só você vê a sua pulseira. Relato nunca conta para nada aqui.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
      {g && <Detalhe id={aberta} g={g} onClose={() => setAberta(null)} />}
      <BoxModal visible={caixa} onClose={() => setCaixa(false)} />
    </>
  );
}
