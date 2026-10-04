import { RotateCcw, Sparkle } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { EASE, FadeUp, useSvgId } from "@/components/gami/Anim";
import { WeekRing } from "@/components/gami/Rings";
import { Sheet } from "@/components/gami/Sheet";
import { hojeSP, useGamification, useMyWeek, type DiaQueContou } from "@/hooks/useGamification";
import { colors, mark } from "@/theme/tokens";

// Detalhe da semana: só os dias que contaram (dia sem Irisa aberta nunca aparece), como a semana
// funciona e as cinco semanas anteriores.

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DOT = [mark.ring[0], mark.ring[2], mark.ring[3], mark.ring[5]];
const pad = (n: number) => String(n).padStart(2, "0");
function data(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
const iso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const ddmm = (dt: Date) => `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;
function maisDias(dt: Date, n: number) {
  const x = new Date(dt);
  x.setDate(x.getDate() + n);
  return x;
}
function rotulo(dia: string, hoje: string) {
  if (dia.slice(0, 10) === hoje) return "Hoje";
  if (dia.slice(0, 10) === iso(maisDias(data(hoje), -1))) return "Ontem";
  const dt = data(dia);
  return `${NOMES[dt.getDay()]}, ${ddmm(dt)}`;
}

function Linha({ texto, ganho, cor }: { texto: string; ganho?: string; cor?: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="flex-1 font-body text-[13px] text-muted">{texto}</Text>
      {ganho && (
        <Text className="font-body-bold text-[12px]" style={{ color: cor }}>
          {ganho}
        </Text>
      )}
    </View>
  );
}

function Dia({ d, i, hoje, delay }: { d: DiaQueContou; i: number; hoje: string; delay: number }) {
  const n = d.avaliacoes ?? 0;
  return (
    <FadeUp delay={delay}>
      <View className="rounded-[18px] bg-solid px-3.5 py-3">
        <View
          style={{
            position: "absolute",
            left: -20,
            top: 16,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: "#FFFFFF",
            borderWidth: 3,
            borderColor: DOT[i % DOT.length],
          }}
        />
        <Text className="font-body-bold text-[14px] text-ink">{rotulo(d.dia, hoje)}</Text>
        <View className="mt-1.5 gap-1">
          <Linha texto="Abriu a Irisa" />
          {d.consultou && (
            <Linha texto="Consultou um lugar" ganho="+1 faísca" cor={colors.yellowInk} />
          )}
          {n > 0 && (
            <Linha
              texto={`Avaliou ${n} ${n === 1 ? "lugar" : "lugares"}`}
              ganho={n === 1 ? "+1 gomo" : "+gomos"}
              cor={colors.turquoiseInk}
            />
          )}
          {d.apoiou && (
            <Linha texto="Escreveu ou reagiu no mural" ganho="+1 faísca" cor={colors.yellowInk} />
          )}
          {i >= 4 && i < 7 && (
            <Linha texto={`${i + 1}º dia na semana`} ganho="+1 faísca" cor={colors.yellowInk} />
          )}
        </View>
      </View>
    </FadeUp>
  );
}

/** Trilho arco-íris que se desenha de cima para baixo ao lado dos dias. */
function Trilho() {
  const reduce = useReducedMotion();
  const id = useSvgId("rail");
  const s = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) s.set(withDelay(500, withTiming(1, { duration: 1000, easing: EASE })));
  }, [reduce, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: s.get() }] }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 7,
          top: 8,
          bottom: 8,
          width: 2,
          borderRadius: 1,
          overflow: "hidden",
          transformOrigin: "top",
        },
        st,
      ]}
    >
      <Svg width={2} height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {mark.ring.map((c, i) => (
              <Stop key={i} offset={i / (mark.ring.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width={2} height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function Regra({ icone, bg, children }: { icone: ReactNode; bg: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-solid px-3 py-2.5">
      <View
        className="h-[34px] w-[34px] items-center justify-center rounded-xl"
        style={{ backgroundColor: bg }}
      >
        {icone}
      </View>
      <Text className="flex-1 font-body text-[13px] leading-[18px] text-muted">{children}</Text>
    </View>
  );
}

function Secao({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-1 font-body-bold text-[12px] uppercase tracking-widest text-dim">
      {children}
    </Text>
  );
}

function Conteudo() {
  const { data: g } = useGamification();
  const { data: semana, isLoading } = useMyWeek();
  const hoje = hojeSP();
  if (!g) return null;
  const dias = g.semana.dias;
  const extra = Math.max(0, Math.min(3, dias - 4));
  const falta = Math.max(0, 4 - dias);

  // As cinco segundas anteriores; semana sem nenhum dia aberto vem vazia (e aparece vazia).
  const hojeDt = data(hoje);
  const segunda = maisDias(hojeDt, -((hojeDt.getDay() + 6) % 7));
  const porInicio = new Map((semana?.semanas ?? []).map((w) => [w.inicio.slice(0, 10), w.dias]));
  const anteriores = [5, 4, 3, 2, 1].map((k) => {
    const ini = maisDias(segunda, -7 * k);
    return { ini, dias: porInicio.get(iso(ini)) ?? 0 };
  });
  const acesas = g.semanas_acesas;

  return (
    <>
      <View className="flex-row items-center gap-4">
        <WeekRing dias={Math.min(4, dias)} size={96} animate delay={450} step={300} />
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[28px] uppercase leading-[30px] text-ink">
            Sua semana
          </Text>
          <Text className="mt-1 font-body text-[14px] leading-[20px] text-muted">
            {dias >= 4 ? (
              <>
                <Text className="font-body-bold text-ink">Semana acesa.</Text>
                {extra > 0
                  ? ` ${extra} dia${extra > 1 ? "s" : ""} a mais, ${extra} faísca${extra > 1 ? "s" : ""}.`
                  : " Cada dia a mais vale uma faísca."}
              </>
            ) : (
              <>
                <Text className="font-body-bold text-ink">{dias} de 4</Text>
                {` dias com a Irisa aberta. Mais ${falta} e a semana acende.`}
              </>
            )}
          </Text>
        </View>
      </View>

      <Secao>Os dias que contaram</Secao>
      {isLoading ? (
        <Text className="font-body text-[13px] text-dim">Carregando…</Text>
      ) : semana && semana.dias.length > 0 ? (
        <View style={{ paddingLeft: 22, gap: 12 }}>
          <Trilho />
          {semana.dias.map((d, i) => (
            <Dia key={d.dia} d={d} i={i} hoje={hoje} delay={600 + i * 260} />
          ))}
        </View>
      ) : (
        <Text className="font-body text-[13px] text-dim">
          Os dias aparecem aqui conforme você abre a Irisa.
        </Text>
      )}

      <Secao>Como a semana funciona</Secao>
      <View className="gap-2">
        <Regra icone={<WeekRing dias={4} size={24} />} bg={colors.turquoise + "2E"}>
          <Text className="font-body-bold text-ink">4 dias quaisquer</Text> acendem a semana e abrem
          uma caixinha.
        </Regra>
        <Regra
          icone={<Sparkle color={colors.yellowInk} fill={colors.yellow} size={18} />}
          bg={colors.yellow + "40"}
        >
          Cada dia a mais (5º, 6º e 7º) dá{" "}
          <Text className="font-body-bold text-ink">uma faísca</Text>.
        </Regra>
        <Regra
          icone={<RotateCcw color={colors.lilacInk} size={18} strokeWidth={2.2} />}
          bg={colors.lilac + "33"}
        >
          Na segunda começa outra.{" "}
          <Text className="font-body-bold text-ink">Nada do que você ganhou some.</Text>
        </Regra>
      </View>

      <Secao>Semanas anteriores</Secao>
      <View className="flex-row justify-between rounded-[18px] bg-solid px-3.5 py-3">
        {anteriores.map((w, i) => (
          <View key={i} className="items-center gap-1">
            <WeekRing dias={w.dias} size={38} animate delay={1300 + i * 140} step={120} />
            <Text className="font-body text-[11px] text-dim">{ddmm(w.ini)}</Text>
          </View>
        ))}
      </View>
      <Text className="text-center font-body text-[13px] text-muted">
        <Text className="font-body-bold text-ink">
          {acesas} semana{acesas === 1 ? "" : "s"} acesa{acesas === 1 ? "" : "s"}.
        </Text>
        {acesas < 4 ? " Com 4, chega a Já Mora Aqui." : ""}
      </Text>
    </>
  );
}

export function WeekSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Conteudo />
    </Sheet>
  );
}
