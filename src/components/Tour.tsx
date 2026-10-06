import { router } from "expo-router";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useGamification } from "@/hooks/useGamification";
import { tabBarBottom } from "@/hooks/useScreenInsets";
import {
  fecharTour,
  medirAlvo,
  rolagemInicioAtual,
  rolarInicio,
  useTourTarget,
  type TourRect,
} from "@/hooks/useTour";
import { flexiona } from "@/theme/domain";
import { colors, glass, mark } from "@/theme/tokens";

// Tour v2 (04/10/2026, docs/prototipo-gamificacao-v2.html): no lugar das seis telas com ícones
// pulando, o tour acontece em cima do próprio Início. Primeiro o anel da marca se enche gomo a gomo
// e o título se revela; depois um holofote passa por cada coisa de verdade (botões do painel,
// emergência, cartões da semana, abas) e uma borda arco-íris se desenha em volta do alvo.

const AP = Animated.createAnimatedComponent(Path);
const AR = Animated.createAnimatedComponent(Rect);
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const PAD = 6;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Marca a View como alvo do tour (id do passo). Não muda o layout de quem embrulha. */
export function TourTarget({
  id,
  children,
  style,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useTourTarget(id);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

type Passo = {
  id: string;
  t: string;
  x: (forma: number) => string;
  /** Raio do alvo (sem o respiro); sem ele, cápsula (metade da altura). */
  r?: number;
  /** Alvo dentro da rolagem do Início: rola até ele se estiver fora da tela. */
  rola?: boolean;
};

const PASSOS: Passo[] = [
  {
    id: "avaliar",
    t: "Avaliar um lugar",
    rola: true,
    x: (f) =>
      `Quatro perguntas sobre como você foi ${flexiona("recebid", f)}. Leva um minuto, e com 5 avaliações o lugar ganha selo.`,
  },
  {
    id: "relato",
    t: "Registrar relato",
    rola: true,
    x: () =>
      "Se algo aconteceu, registre sem se identificar. Vira aviso na rua, nunca nota do lugar.",
  },
  {
    id: "sos",
    t: "Emergência",
    x: () => "Em qualquer tela. Liga direto para 190, 192, 100 ou 188.",
  },
  {
    id: "gami",
    t: "Sua semana e sua cidade",
    r: 24,
    rola: true,
    x: () =>
      "Cada dia que você abre a Irisa acende um pedaço da semana. E o anel de 100 mostra quantos lugares mais conhecidos da cidade já têm selo.",
  },
  {
    id: "tab-mapa",
    t: "Mapa",
    x: () => "Lugares com cor e as áreas onde já houve relato.",
  },
  {
    id: "tab-apoio",
    t: "Apoio",
    x: () => "Mural da comunidade e os serviços de acolhimento da sua cidade.",
  },
  {
    id: "tab-perfil",
    t: "Perfil",
    x: () => "Sua evolução e suas conquistas ficam aqui. Só você vê, e relato nunca conta ponto.",
  },
];

// ---------- anel da marca, gomo a gomo ----------
const GOMOS = 48;
function pt(r: number, a: number) {
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}
function gomo(ro: number, ri: number, a0: number, a1: number) {
  const o0 = pt(ro, a0),
    o1 = pt(ro, a1),
    i1 = pt(ri, a1),
    i0 = pt(ri, a0);
  return `M ${o0.x} ${o0.y} A ${ro} ${ro} 0 0 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${ri} ${ri} 0 0 0 ${i0.x} ${i0.y} Z`;
}
function lerp(a: string, b: string, t: number) {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const x = parseInt(a.slice(i, i + 2), 16),
      y = parseInt(b.slice(i, i + 2), 16);
    out += Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}
function corDoAnel(t: number) {
  const p = t * mark.ring.length;
  const i = Math.floor(p) % mark.ring.length;
  return lerp(mark.ring[i], mark.ring[(i + 1) % mark.ring.length], p - Math.floor(p));
}
const GOMOS_D = Array.from({ length: GOMOS }, (_, i) => ({
  d: gomo(
    48,
    35,
    (i / GOMOS) * 2 * Math.PI - Math.PI / 2,
    ((i + 1) / GOMOS) * 2 * Math.PI - Math.PI / 2 + 0.05,
  ),
  fill: corDoAnel(i / GOMOS),
}));

function Gomo({
  d,
  fill,
  i,
  cheio,
}: {
  d: string;
  fill: string;
  i: number;
  cheio: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => ({ opacity: cheio.get() > i ? 1 : 0 }));
  return <AP d={d} fill={fill} animatedProps={props} />;
}

function AnelEnchendo({ size, reduce }: { size: number; reduce: boolean }) {
  const cheio = useSharedValue(reduce ? GOMOS : 0);
  const giro = useSharedValue(reduce ? 0 : -30);
  useEffect(() => {
    if (reduce) return;
    // 24 ms por gomo, como no protótipo; o anel gira um pouco enquanto enche.
    cheio.set(withDelay(250, withTiming(GOMOS, { duration: GOMOS * 24, easing: Easing.linear })));
    giro.set(withDelay(200, withTiming(0, { duration: 1600, easing: EASE })));
  }, [reduce, cheio, giro]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.get()}deg` }] }));
  return (
    <Animated.View style={st}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {GOMOS_D.map((g, i) => (
          <Gomo key={i} d={g.d} fill={g.fill} i={i} cheio={cheio} />
        ))}
        <Circle cx={50} cy={50} r={13} fill={mark.pupil} />
        <Circle cx={46.1} cy={45.6} r={2.86} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/** Revela o conteúdo da esquerda para a direita (máscara de largura), sem refazer as linhas. */
function Revela({
  delay,
  duration,
  reduce,
  children,
}: {
  delay: number;
  duration: number;
  reduce: boolean;
  children: ReactNode;
}) {
  const [w, setW] = useState(0);
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!w || reduce) return;
    p.set(withDelay(delay, withTiming(1, { duration, easing: EASE })));
  }, [w, reduce, delay, duration, p]);
  const st = useAnimatedStyle(() => ({ width: w * p.get() }));
  return (
    <View style={{ alignSelf: "stretch" }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        // A máscara corta tudo que passa da caixa: no iOS o acento das maiúsculas em Oswald (À, É)
        // sobe acima da linha. A folga de 8 em cima e embaixo (devolvida na margem) evita o corte.
        <Animated.View style={[{ overflow: "hidden", paddingVertical: 8, marginVertical: -8 }, st]}>
          <View style={{ width: w }}>{children}</View>
        </Animated.View>
      ) : (
        <View style={{ opacity: 0 }}>{children}</View>
      )}
    </View>
  );
}

function BoasVindas({
  forma,
  reduce,
  onComecar,
  onAgoraNao,
}: {
  forma: number;
  reduce: boolean;
  onComecar: () => void;
  onAgoraNao: () => void;
}) {
  const entra = (delay: number) => (reduce ? undefined : FadeInDown.duration(400).delay(delay));
  return (
    <Animated.View
      entering={reduce ? undefined : FadeIn.duration(400)}
      exiting={reduce ? undefined : FadeOut.duration(300)}
      style={[StyleSheet.absoluteFill, styles.welcome]}
    >
      <AnelEnchendo size={150} reduce={reduce} />
      <View style={{ marginTop: 22, alignSelf: "stretch" }}>
        <Revela delay={900} duration={800} reduce={reduce}>
          <Text className="text-center font-display text-[36px] uppercase leading-[42px] text-ink">
            {flexiona("Bem-vind", forma)} à Irisa
          </Text>
        </Revela>
      </View>
      <View style={{ marginTop: 10, alignSelf: "stretch" }}>
        <Revela delay={1300} duration={900} reduce={reduce}>
          <Text className="text-center font-body text-[16px] leading-[24px] text-muted">
            O mapa dos lugares onde a gente é bem-vinde, feito por nós. Em 30 segundos te mostramos
            onde fica cada coisa.
          </Text>
        </Revela>
      </View>
      <View style={{ marginTop: 28, alignSelf: "stretch", gap: 6 }}>
        <Animated.View entering={entra(1800)}>
          <Pressable
            onPress={onComecar}
            className="h-[52px] items-center justify-center rounded-full active:opacity-80"
            style={{ backgroundColor: colors.night }}
          >
            <Text className="font-body-bold text-[16px] text-paper">Começar</Text>
          </Pressable>
        </Animated.View>
        <Animated.View entering={entra(1900)}>
          <Pressable
            onPress={onAgoraNao}
            className="h-11 items-center justify-center rounded-full active:opacity-60"
          >
            <Text className="font-body-medium text-[14px] text-dim">Agora não</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Raio do holofote: o do passo, ou cápsula (metade da altura), mais o respiro. */
function raioDo(p: Passo, r: TourRect) {
  return (p.r ?? r.h / 2) + PAD;
}

/** Perímetro do retângulo arredondado (para a borda se desenhar com dasharray). */
function perimetro(w: number, h: number, r: number) {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/** Borda arco-íris que percorre o contorno do alvo (0 → 1 em `draw`). */
function Traco({ alvo, raio, draw }: { alvo: TourRect; raio: number; draw: SharedValue<number> }) {
  const gid = `tourgrad-${useId()}`;
  const tw = alvo.w + PAD * 2,
    th = alvo.h + PAD * 2;
  const rx = Math.max(0, Math.min(raio - 1.5, th / 2 - 1.5, tw / 2 - 1.5));
  const P = perimetro(tw - 3, th - 3, rx);
  const props = useAnimatedProps(() => ({ strokeDashoffset: P * (1 - draw.get()) }));
  const fade = useAnimatedStyle(() => ({ opacity: draw.get() > 0 ? 1 : 0 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: alvo.x - PAD, top: alvo.y - PAD }, fade]}
    >
      <Svg width={tw} height={th}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            {mark.ring.map((c, i) => (
              <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <AR
          x={1.5}
          y={1.5}
          width={tw - 3}
          height={th - 3}
          rx={rx}
          ry={rx}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={[P, P]}
          animatedProps={props}
        />
      </Svg>
    </Animated.View>
  );
}

export function Tour() {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const forma = useGamification().data?.forma ?? 2;
  const [tam, setTam] = useState({ w: win.width, h: win.height });
  const [fase, setFase] = useState<"boasvindas" | "holofote">("boasvindas");
  const [passos, setPassos] = useState<Passo[]>([]);
  const [i, setI] = useState(0);
  const [alvo, setAlvo] = useState<TourRect | null>(null);
  const [bolhaH, setBolhaH] = useState(170);
  const fechando = useRef(false);
  const vez = useRef(0); // cada passo novo invalida o anterior (toques rápidos em Próximo)

  // Buraco do holofote (já com o respiro).
  const hx = useSharedValue(0);
  const hy = useSharedValue(0);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  const hr = useSharedValue(0);
  const veu = useSharedValue(0);
  const draw = useSharedValue(0);
  const bolha = useSharedValue(0);
  const raiz = useSharedValue(1);

  // O tour acontece no Início, do topo (Perfil → Rever o tour também volta para cá).
  useEffect(() => {
    router.navigate("/");
    rolarInicio(0, false);
  }, []);

  const fechar = useCallback(() => {
    if (fechando.current) return;
    fechando.current = true;
    vez.current++;
    raiz.set(withTiming(0, { duration: reduce ? 0 : 260 }));
    rolarInicio(0);
    setTimeout(fecharTour, reduce ? 0 : 280);
  }, [raiz, reduce]);

  // Voltar do Android fecha o tour em vez de navegar por baixo dele.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      fechar();
      return true;
    });
    return () => sub.remove();
  }, [fechar]);

  const topoUtil = insets.top + 8 + glass.headerHeight + 16;
  const baseUtil = tam.h - (glass.tabBarHeight + tabBarBottom(insets.bottom)) - 12;

  const ir = useCallback(
    async (lista: Passo[], n0: number) => {
      const minha = ++vez.current;
      const primeiro = veu.get() === 0;
      bolha.set(withTiming(0, { duration: reduce ? 0 : 160 }));
      draw.set(0);
      // Alvo que sumiu no meio do caminho é pulado.
      let n = n0;
      let r: TourRect | null = null;
      while (n < lista.length) {
        r = await medirAlvo(lista[n].id);
        if (minha !== vez.current) return;
        if (r) break;
        n++;
      }
      if (!r || n >= lista.length) return fechar();
      const p = lista[n];
      if (p.rola) {
        const cabeAbaixo = r.y + r.h + PAD + 20 + bolhaH < baseUtil;
        const cabeAcima = r.y - PAD - 20 - bolhaH > topoUtil;
        const visivel = r.y >= topoUtil && r.y + r.h <= baseUtil;
        if (!visivel || (!cabeAbaixo && !cabeAcima)) {
          rolarInicio(rolagemInicioAtual() + r.y - topoUtil - 8, !reduce);
          await esperar(reduce ? 80 : 450);
          if (minha !== vez.current) return;
          r = (await medirAlvo(p.id)) ?? r;
        }
      } else if (!primeiro) {
        await esperar(reduce ? 0 : 160);
      }
      if (minha !== vez.current) return;
      const raio = raioDo(p, r);
      const alvoH = { x: r.x - PAD, y: r.y - PAD, w: r.w + PAD * 2, h: r.h + PAD * 2 };
      const dur = primeiro || reduce ? 0 : 550;
      const cfg = { duration: dur, easing: EASE };
      hx.set(withTiming(alvoH.x, cfg));
      hy.set(withTiming(alvoH.y, cfg));
      hw.set(withTiming(alvoH.w, cfg));
      hh.set(withTiming(alvoH.h, cfg));
      hr.set(withTiming(raio, cfg));
      if (primeiro) veu.set(withTiming(1, { duration: reduce ? 0 : 350 }));
      setI(n);
      setAlvo(r);
      draw.set(
        reduce ? 1 : withDelay(dur ? 350 : 200, withTiming(1, { duration: 900, easing: EASE })),
      );
      bolha.set(withDelay(reduce ? 0 : 60, withTiming(1, { duration: reduce ? 0 : 300 })));
    },
    [baseUtil, bolhaH, bolha, draw, fechar, hh, hr, hw, hx, hy, reduce, topoUtil, veu],
  );

  const comecar = useCallback(async () => {
    rolarInicio(0, false);
    await esperar(60);
    // Só os alvos que existem nesta tela (os cartões da semana somem sem a gamificação no banco).
    const medidas = await Promise.all(PASSOS.map((p) => medirAlvo(p.id)));
    const lista = PASSOS.filter((_, k) => medidas[k]);
    if (!lista.length) return fechar();
    setPassos(lista);
    setFase("holofote");
    ir(lista, 0);
  }, [fechar, ir]);

  const W = tam.w,
    H = tam.h;
  const veuProps = useAnimatedProps(() => {
    const x = hx.get(),
      y = hy.get(),
      w = Math.max(0, hw.get()),
      h = Math.max(0, hh.get());
    const r = Math.max(0, Math.min(hr.get(), w / 2, h / 2));
    return {
      d:
        `M0 0H${W}V${H}H0Z ` +
        `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
        `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
        `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
    };
  });
  const veuStyle = useAnimatedStyle(() => ({ opacity: veu.get() }));
  const raizStyle = useAnimatedStyle(() => ({ opacity: raiz.get() }));
  const bolhaStyle = useAnimatedStyle(() => ({
    opacity: bolha.get(),
    transform: [{ translateY: 6 * (1 - bolha.get()) }],
  }));

  const p = passos[i];
  const ultimo = i === passos.length - 1;
  const raioTraco = p && alvo ? raioDo(p, alvo) : 0;
  // Balão abaixo do alvo quando cabe; senão, acima (as abas sempre caem aqui).
  const abaixo = !!alvo && alvo.y + alvo.h + PAD + 14 + bolhaH < H - insets.bottom - 12;
  const bolhaPos: ViewStyle = !alvo
    ? { top: H }
    : abaixo
      ? { top: alvo.y + alvo.h + PAD + 14 }
      : { bottom: H - (alvo.y - PAD - 14) };
  const setaX = alvo ? Math.min(W - 40 - 30, Math.max(14, alvo.x + alvo.w / 2 - 20 - 8)) : 14;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }, raizStyle]}
      onLayout={(e) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {fase === "boasvindas" ? (
        <BoasVindas forma={forma} reduce={reduce} onComecar={comecar} onAgoraNao={fechar} />
      ) : (
        <>
          {/* O véu segura os toques: só o balão responde durante o tour. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, veuStyle]}
            onStartShouldSetResponder={() => true}
          >
            <Svg width={W} height={H}>
              <AP animatedProps={veuProps} fill="rgba(20,24,41,0.55)" fillRule="evenodd" />
            </Svg>
          </Animated.View>
          {alvo && p && <Traco key={`${p.id}-${i}`} alvo={alvo} raio={raioTraco} draw={draw} />}
          {p && (
            <Animated.View
              style={[styles.bolha, bolhaPos, bolhaStyle]}
              onLayout={(e) => setBolhaH(e.nativeEvent.layout.height)}
            >
              <View style={[styles.seta, { left: setaX }, abaixo ? { top: -7 } : { bottom: -7 }]} />
              <Text className="font-display text-[22px] uppercase leading-[27px] text-ink">
                {p.t}
              </Text>
              <Text className="mt-1.5 font-body text-[14px] leading-[20px] text-muted">
                {p.x(forma)}
              </Text>
              <View className="mt-3 flex-row items-center gap-2.5">
                <View className="flex-1 flex-row gap-[5px]">
                  {passos.map((q, k) => (
                    <View
                      key={q.id}
                      style={{
                        width: k === i ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: k === i ? colors.ink : colors.border,
                      }}
                    />
                  ))}
                </View>
                {!ultimo && (
                  <Pressable onPress={fechar} hitSlop={8} className="px-1 py-2">
                    <Text className="font-body-medium text-[13px] text-dim">Pular</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => ir(passos, i + 1)}
                  className="h-[38px] items-center justify-center rounded-full px-4 active:opacity-80"
                  style={{ backgroundColor: colors.night }}
                >
                  <Text className="font-body-bold text-[14px] text-paper">
                    {ultimo ? "Começar a usar" : "Próximo"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  welcome: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    backgroundColor: "rgba(245,244,241,0.94)",
  },
  bolha: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 14,
    boxShadow: "0 18px 40px rgba(20,24,41,0.28)",
  },
  seta: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
});
