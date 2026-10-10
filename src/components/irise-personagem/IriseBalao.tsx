import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path, Rect } from "react-native-svg";

import type { Fala } from "@/lib/iriseFalas";

const PASSO = 4000;

/** Rodada única: passa por todas as falas (4 s cada) e para na última. Com uma fala só (ou
 * nenhuma), não tem o que rodar — fica parado na primeira, sem travar. */
export function useRodadaFalas(falas: Fala[]) {
  const [i, setI] = useState(0);
  const [visivel, setVisivel] = useState(true);
  const opacidade = useSharedValue(1);
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trocaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parar = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (trocaTimer.current) clearTimeout(trocaTimer.current);
    trocaTimer.current = null;
  };
  const ir = (n: number) => {
    if (reduce) {
      setI(n);
      opacidade.set(1);
      return;
    }
    opacidade.set(withTiming(0, { duration: 125 }));
    trocaTimer.current = setTimeout(() => {
      setI(n);
      opacidade.set(withTiming(1, { duration: 125 }));
      trocaTimer.current = null;
    }, 125);
  };
  // A lista de falas mudou (ex.: um relato surgiu/sumiu) — volta pra primeira. Feito durante o
  // render (padrão do React pra "ajustar estado quando algo muda"), não num efeito: setState direto
  // no corpo de um efeito encadeia renders à toa.
  const [tamanhoAnterior, setTamanhoAnterior] = useState(falas.length);
  if (falas.length !== tamanhoAnterior) {
    setTamanhoAnterior(falas.length);
    setI(0);
    opacidade.set(1);
  }

  useEffect(() => {
    if (falas.length <= 1) return parar;
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      ir(n);
      if (n >= falas.length - 1) parar();
    }, PASSO);
    return parar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [falas.length]);
  return {
    i,
    fala: falas[Math.min(i, Math.max(falas.length - 1, 0))],
    visivel,
    opacidade,
    pular: (n: number) => {
      parar();
      ir(n);
    },
    fechar: () => {
      parar();
      setVisivel(false);
    },
  };
}

/** Balão de uma peça só (retângulo raio 18 + ponta), branco com opacidade .55 no conjunto, sem blur. */
export function IriseBalao({
  nome,
  fala,
  total,
  indice,
  opacidade,
  onPular,
  onCta,
  onFechar,
}: {
  nome: string;
  fala: Fala;
  total: number;
  indice: number;
  opacidade: SharedValue<number>;
  onPular: (n: number) => void;
  onCta: () => void;
  onFechar: () => void;
}) {
  const [{ w, h }, setTam] = useState({ w: 0, h: 0 });
  const bob = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    bob.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [bob, reduce]);
  const estiloBob = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * bob.get() }] }));
  const estiloTexto = useAnimatedStyle(() => ({ opacity: opacidade.get() }));
  // Ponta: sai da borda de baixo, entre 100 e 74 pt antes da borda direita; desce 14 pt. Nunca encosta no cabelo.
  const ponta = `M${w - 100} ${h - 1} H${w - 74} C${w - 74} ${h + 6} ${w - 72} ${h + 11} ${w - 67} ${h + 14} C${w - 81} ${h + 15} ${w - 94} ${h + 10} ${w - 100} ${h - 1} Z`;
  return (
    <Animated.View
      onLayout={(e) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ alignSelf: "flex-end", marginRight: 44, minWidth: 220, maxWidth: 310 }, estiloBob]}
    >
      {w > 0 && (
        <Svg width={w} height={h + 16} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} pointerEvents="none">
          <G opacity={0.55} fill="#FFFFFF">
            <Rect width={w} height={h} rx={18} />
            <Path d={ponta} />
          </G>
        </Svg>
      )}
      <View style={{ paddingTop: 6, paddingRight: 13, paddingBottom: 7, paddingLeft: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: "Oswald_700Bold", fontSize: 12.5, color: "#0A8B7A" }}>{nome}</Text>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#49DCC0" }} />
          <Animated.Text style={[{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 9, letterSpacing: 1.08, color: fala.cor }, estiloTexto]}>
            {fala.tag}
          </Animated.Text>
          <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3 }}>
            {Array.from({ length: total }).map((_, k) => (
              <Pressable
                key={k}
                hitSlop={6}
                onPress={() => onPular(k)}
                style={{
                  width: k === indice ? 16 : 5,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: k === indice ? "#141829" : "rgba(20,24,41,0.22)",
                }}
              />
            ))}
          </View>
          <Pressable hitSlop={6} onPress={onCta} style={{ marginLeft: 8 }}>
            <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 11, color: "#0A8B7A" }}>{fala.cta}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={onFechar} style={{ marginLeft: 6 }}>
            <Text style={{ fontSize: 13, color: "#8E96AE" }}>×</Text>
          </Pressable>
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[{ marginTop: 3, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13, lineHeight: 17, color: "#141829" }, estiloTexto]}
        >
          {fala.texto}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
