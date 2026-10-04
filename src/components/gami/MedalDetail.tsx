import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Counter, FadeUp, Segs } from "@/components/gami/Anim";
import {
  BotaoCompartilhar,
  CompartilharSheet,
  type Compartilhavel,
} from "@/components/gami/Compartilhar";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { Sheet } from "@/components/gami/Sheet";
import { ctaDa, unidadeTexto, type Gamificacao } from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { colors } from "@/theme/tokens";

/** Detalhe da medalha: o anel enche, o número conta, a barra acende e o botão diz o que fazer. */
export function MedalDetail({
  id,
  g,
  onClose,
}: {
  id: string | null;
  g: Gamificacao;
  onClose: () => void;
}) {
  const m = id ? getMedalha(id) : null;
  return (
    <Sheet visible={!!m} onClose={onClose} contentStyle={{ alignItems: "center", gap: 0 }}>
      {m && <Conteudo id={m.id} g={g} onClose={onClose} />}
    </Sheet>
  );
}

function Conteudo({ id, g, onClose }: { id: string; g: Gamificacao; onClose: () => void }) {
  const m = getMedalha(id)!;
  const p = g.medalhas.find((x) => x.id === id);
  const c = g.conquistadas.find((x) => x.id === id);
  const ok = !!c;
  const mostrarNumero = !ok && !!p && p.alvo > 1;
  const nSegs = p ? Math.min(p.alvo, 30) : 0;
  const cta = ok ? null : ctaDa(id);
  const [story, setStory] = useState<Compartilhavel | null>(null);

  return (
    <>
      <View style={{ marginTop: 8 }}>
        <AnimatedMedal
          id={id}
          size={190}
          on={ok}
          prog={p ? p.valor / p.alvo : 0}
          banho={c?.banho ?? null}
          delay={500}
          duration={1400}
          flutua
        />
      </View>
      <FadeUp delay={250}>
        <Text className="mt-4 text-center font-display text-[36px] uppercase leading-[40px] text-ink">
          {nomeDa(m, g.forma)}
        </Text>
        <Text className="mt-1 max-w-[300px] self-center text-center font-body text-[15px] leading-[21px] text-muted">
          {ok ? `“${m.copy}”` : m.cond}
        </Text>
      </FadeUp>
      {mostrarNumero && p && (
        <>
          <View className="mt-4 flex-row items-center gap-1.5">
            <Counter
              value={p.valor}
              duration={900}
              delay={500}
              className="font-display text-[44px] text-ink"
            />
            <Text className="font-body text-[17px] text-dim">
              de {p.alvo}
              {p.unidade ? ` ${unidadeTexto(p.unidade, p.alvo)}` : ""}
            </Text>
          </View>
          <Segs
            n={nSegs}
            lit={(p.valor / p.alvo) * nSegs}
            delay={650}
            step={Math.max(25, 600 / nSegs)}
            style={{ width: "100%", maxWidth: 300, marginTop: 8 }}
          />
        </>
      )}
      {ok && c && (
        <Text className="mt-3 font-body text-[13px] text-dim">
          Desbloqueada em {new Date(c.em).toLocaleDateString("pt-BR")}
          {c.banho ? ` · banho ${c.banho === "holo" ? "holográfico" : c.banho}` : ""}
        </Text>
      )}
      {ok && c && (
        <View className="mt-4 w-full">
          <BotaoCompartilhar onPress={() => setStory({ tipo: "medalha", id, banho: c.banho })} />
        </View>
      )}
      <CompartilharSheet c={story} onClose={() => setStory(null)} />
      {cta && (
        <Pressable
          onPress={() => {
            onClose();
            router.push(cta.href as Href);
          }}
          className="mt-5 w-full items-center rounded-full py-3.5 active:opacity-80"
          style={{ backgroundColor: colors.night }}
        >
          <Text className="font-body-bold text-[15px] text-paper">{cta.label}</Text>
        </Pressable>
      )}
    </>
  );
}
