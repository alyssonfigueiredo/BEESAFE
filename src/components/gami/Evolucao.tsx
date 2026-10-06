import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { FadeUp, ProgressEdge, Segs } from "@/components/gami/Anim";
import { SliceRing } from "@/components/gami/Rings";
import {
  BotaoCompartilhar,
  CompartilharSheet,
  type Compartilhavel,
} from "@/components/gami/Compartilhar";
import { NivelIcone } from "@/components/gami/NivelIcone";
import { Sheet } from "@/components/gami/Sheet";
import { useFolhaAberta } from "@/hooks/useDiscovery";
import { useForma, useGamification, useRewardOpen } from "@/hooks/useGamification";
import { getMedalha } from "@/lib/medals";
import { nivelDe, nomeNivel, NIVEIS_EVO } from "@/lib/niveis";
import { colors, shadow } from "@/theme/tokens";

// Sua evolução: a íris de 48 gomos com o nível em título e ícone (8 degraus, de Curiose a Patrimônio
// LGBTQIA+). Cartão no Perfil, trilha numa folha e a comemoração calma quando a pessoa sobe.

export { NivelIcone };

function faltaTexto(n: number) {
  return `Falta${n > 1 ? "m" : ""} ${n} gomo${n > 1 ? "s" : ""}`;
}

/** Perfil: no lugar do antigo cartão "Seu anel". */
export function EvolucaoCard() {
  const { data: g } = useGamification();
  const forma = useForma();
  const [aberta, setAberta] = useState(false);
  if (!g) return null;
  const i = nivelDe(g.gomos);
  const n = NIVEIS_EVO[i];
  const prox = NIVEIS_EVO[i + 1];
  const max = g.gomos_semana_max ?? 4;
  const semana = g.gomos_semana ?? null;
  const cheia = semana != null && semana >= max;

  return (
    <>
      <Pressable
        onPress={() => setAberta(true)}
        className="rounded-[30px] bg-surface px-5 py-4 active:opacity-90"
        style={shadow.card}
        accessibilityRole="button"
        accessibilityLabel={`Sua evolução: ${nomeNivel(n, forma)}, nível ${i + 1} de 8. Ver a trilha.`}
      >
        <ProgressEdge frac={1} radius={30} duration={1300} />
        <View className="flex-row items-center gap-4">
          <View style={{ width: 92, height: 92 }}>
            <SliceRing lit={g.gomos} size={92} animate delay={250} step={45} />
            {/* O ícone do nível num selinho encostado na íris. */}
            <View
              className="absolute items-center justify-center rounded-full bg-solid"
              style={[{ right: -6, bottom: -4, width: 40, height: 40 }, shadow.card]}
            >
              <NivelIcone k={i} size={31} entrada={700} />
            </View>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
              Sua evolução · nível {i + 1} de 8
            </Text>
            <Text className="mt-0.5 font-display text-[26px] uppercase leading-[31px] text-ink">
              {nomeNivel(n, forma)}
            </Text>
            <Text className="mt-0.5 font-body text-[13px] leading-[18px] text-muted">{n.t}</Text>
          </View>
        </View>

        {prox && (
          <Segs
            n={prox.g - n.g}
            lit={g.gomos - n.g}
            delay={700}
            step={90}
            style={{ marginTop: 12 }}
          />
        )}
        <View className="mt-1.5 flex-row justify-between gap-2">
          <Text className="min-w-0 flex-1 font-body text-[12.5px] text-muted" numberOfLines={2}>
            {prox
              ? `${faltaTexto(prox.g - g.gomos)} para ${nomeNivel(prox, forma)}`
              : "A íris inteira acesa"}
          </Text>
          <Text className="font-body text-[12.5px] text-dim">{g.gomos} de 48</Text>
        </View>
        {semana != null && (
          <View className="mt-2.5 flex-row flex-wrap items-center gap-1.5">
            <Text className="font-body text-[12px] text-dim">Esta semana</Text>
            <Segs
              n={max}
              lit={Math.min(semana, max)}
              delay={500}
              step={160}
              colorful={false}
              style={{ width: 70 }}
            />
            <Text className="font-body text-[12px] text-dim">
              {Math.min(semana, max)} de {max}
              {cheia ? " · segunda tem mais" : ""}
            </Text>
          </View>
        )}
        <View className="mt-2.5 flex-row items-center gap-0.5">
          <Text className="font-body-bold text-[13px]" style={{ color: colors.turquoiseInk }}>
            Ver a trilha
          </Text>
          <ChevronRight color={colors.turquoiseInk} size={14} strokeWidth={3} />
        </View>
      </Pressable>
      <TrilhaSheet visible={aberta} onClose={() => setAberta(false)} />
    </>
  );
}

function Passo({
  k,
  atual,
  gomos,
  forma,
}: {
  k: number;
  atual: number;
  gomos: number;
  forma: number;
}) {
  const n = NIVEIS_EVO[k];
  const feito = k < atual;
  const agora = k === atual;
  const futuro = k > atual;
  return (
    <FadeUp delay={250 + k * 70}>
      <View className="flex-row items-center gap-3 py-1.5">
        <View
          className="h-[50px] w-[50px] items-center justify-center rounded-full"
          style={[
            { backgroundColor: futuro ? colors.subtle : colors.solid, opacity: futuro ? 0.55 : 1 },
            agora
              ? { boxShadow: `0 0 0 3px #fff, 0 0 0 5.5px ${colors.turquoise}` }
              : futuro
                ? null
                : shadow.card,
          ]}
        >
          <NivelIcone k={k} size={37} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-body-bold text-[14.5px]"
            style={{ color: futuro ? colors.dim : colors.ink }}
          >
            {nomeNivel(n, forma)}
          </Text>
          <Text
            className="font-body text-[12px] leading-[16px]"
            style={{ color: futuro ? colors.dim : colors.muted }}
          >
            {n.t}
          </Text>
        </View>
        <Text
          className={`text-[11.5px] ${agora ? "font-body-bold" : "font-body"}`}
          style={{ color: agora ? colors.turquoiseInk : colors.dim }}
        >
          {feito ? `${n.g} gomos` : agora ? "você está aqui" : `faltam ${n.g - gomos}`}
        </Text>
      </View>
    </FadeUp>
  );
}

/** A trilha dos 8 níveis. */
export function TrilhaSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: g } = useGamification();
  const forma = useForma();
  const [story, setStory] = useState<Compartilhavel | null>(null);
  if (!g) return null;
  const i = nivelDe(g.gomos);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View>
        <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
          Sua evolução
        </Text>
        <Text className="mt-1 font-display text-[26px] uppercase leading-[31px] text-ink">
          Você é {nomeNivel(NIVEIS_EVO[i], forma)}
        </Text>
        <Text className="mt-1 font-body text-[13.5px] leading-[19px] text-muted">
          Cada gomo da íris é uma contribuição sua. A íris enche e você sobe de nível.
        </Text>
      </View>
      <View>
        {NIVEIS_EVO.map((_, k) => (
          <Passo key={k} k={k} atual={i} gomos={g.gomos} forma={forma} />
        ))}
      </View>
      <View className="rounded-[18px] px-4 py-3" style={{ backgroundColor: colors.subtle }}>
        <Text className="font-body text-[12.5px] leading-[18px] text-muted">
          <Text className="font-body-bold text-ink">Como os gomos acendem: </Text>
          uma avaliação, a 5ª avaliação de um lugar (a do selo), um lugar cadastrado, uma foto
          aprovada. No máximo 4 por semana. Relato nunca conta.
        </Text>
      </View>
      <BotaoCompartilhar
        label="Compartilhar meu nível"
        onPress={() => setStory({ tipo: "nivel", k: i })}
      />
      <CompartilharSheet c={story} onClose={() => setStory(null)} />
    </Sheet>
  );
}

// ---------- subiu de nível ----------
// O nível que o aparelho já comemorou. Na primeira vez só guarda, sem festa: quem atualiza o app já
// com gomos não ganha uma comemoração de algo que não acabou de acontecer.
const NIVEL_KEY = "irisa.nivel.visto.v1";
const ATRASO = 300;
const ANEL = 1300;

/** Fica no layout raiz. Espera a avaliação e as medalhas novas passarem; aparece uma vez. */
export function SubiuDeNivel() {
  const { data: g } = useGamification();
  const forma = useForma();
  const rewardOpen = useRewardOpen();
  const [visto, setVisto] = useState<number | null | undefined>(undefined);
  const [mostrar, setMostrar] = useState<number | null>(null);
  const [story, setStory] = useState<Compartilhavel | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(NIVEL_KEY)
      .then((v) => setVisto(v == null ? null : Number(v)))
      .catch(() => setVisto(null));
  }, []);

  const atual = g ? nivelDe(g.gomos) : null;
  const medalhaNaFila = !!g?.conquistadas?.some((c) => !c.visto && getMedalha(c.id));

  // Primeira vez neste aparelho, ou perdeu gomo (denúncia aceita): vale o nível atual, sem festa.
  const base =
    visto === undefined
      ? undefined
      : visto == null || (atual != null && atual < visto)
        ? atual
        : visto;

  useEffect(() => {
    if (atual == null || base === undefined || base === visto) return;
    AsyncStorage.setItem(NIVEL_KEY, String(base)).catch(() => {});
  }, [atual, base, visto]);

  useEffect(() => {
    if (atual == null || base == null || mostrar != null) return;
    if (atual > base && !rewardOpen && !medalhaNaFila) {
      const t = setTimeout(() => setMostrar(atual), 700);
      return () => clearTimeout(t);
    }
  }, [atual, base, rewardOpen, medalhaNaFila, mostrar]);

  useFolhaAberta(mostrar != null);

  function fechar(trilha: boolean) {
    if (mostrar != null) {
      AsyncStorage.setItem(NIVEL_KEY, String(mostrar)).catch(() => {});
      setVisto(mostrar);
    }
    setMostrar(null);
    if (trilha) router.push("/perfil");
  }

  const n = mostrar != null ? NIVEIS_EVO[mostrar] : null;
  const prox = mostrar != null ? NIVEIS_EVO[mostrar + 1] : null;
  return (
    <Modal
      visible={!!n}
      transparent
      animationType="fade"
      onRequestClose={() => fechar(false)}
      statusBarTranslucent
    >
      {n && mostrar != null && g && (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: "rgba(20,24,41,0.42)" }}
        >
          <FadeUp distance={12} duration={360} style={{ width: "100%", maxWidth: 360 }}>
            <View
              className="items-center rounded-[30px] px-5 pb-5 pt-6"
              style={{ backgroundColor: "#FBFCFE" }}
            >
              <ProgressEdge frac={1} radius={30} duration={1200} delay={200} />
              <FadeUp delay={150}>
                <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                  Você subiu de nível
                </Text>
              </FadeUp>
              <View style={{ width: 132, height: 132, marginTop: 12 }}>
                <SliceRing
                  lit={g.gomos}
                  size={132}
                  animate
                  delay={ATRASO}
                  step={ANEL / Math.max(1, g.gomos)}
                />
                {/* O ícone acende por cima da pupila quando a íris termina de encher. */}
                <FadeUp
                  delay={ATRASO + ANEL - 200}
                  duration={500}
                  distance={0}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    className="items-center justify-center rounded-full bg-solid"
                    style={{ width: 70, height: 70 }}
                  >
                    <NivelIcone k={mostrar} size={58} flutua />
                  </View>
                </FadeUp>
              </View>
              <FadeUp delay={ATRASO + ANEL} style={{ alignItems: "center" }}>
                <Text className="mt-3 text-center font-display text-[32px] uppercase leading-[38px] text-ink">
                  {nomeNivel(n, forma)}
                </Text>
                <Text className="mt-1 text-center font-body text-[14px] leading-[20px] text-muted">
                  {n.t}
                </Text>
                <Text className="mt-2 text-center font-body text-[12.5px] text-dim">
                  {prox
                    ? `Próximo: ${nomeNivel(prox, forma)}, com ${prox.g} gomos.`
                    : "A medalha Patrimônio Cultural já está nas suas Conquistas."}
                </Text>
              </FadeUp>
              <FadeUp delay={ATRASO + ANEL + 150} style={{ alignSelf: "stretch" }}>
                <Pressable
                  onPress={() => fechar(false)}
                  className="mt-4 h-[48px] items-center justify-center rounded-full active:opacity-85"
                  style={{ backgroundColor: colors.night }}
                >
                  <Text className="font-body-bold text-[15px] text-paper">Continuar</Text>
                </Pressable>
                <Pressable
                  onPress={() => fechar(true)}
                  className="mt-2 items-center py-2"
                  hitSlop={6}
                >
                  <Text
                    className="font-body-bold text-[13px]"
                    style={{ color: colors.turquoiseInk }}
                  >
                    Ver no Perfil
                  </Text>
                </Pressable>
              </FadeUp>
            </View>
          </FadeUp>
          <CompartilharSheet c={story} onClose={() => setStory(null)} />
        </View>
      )}
    </Modal>
  );
}
