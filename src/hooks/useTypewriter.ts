import { useEffect, useRef, useState } from "react";

/**
 * Efeito de máquina de escrever por tempo decorrido (não por contagem de ticks), para não travar
 * em timers lentos. `skip()` completa o texto na hora (toque durante a digitação).
 */
export function useTypewriter(texto: string, charsPorSegundo = 60) {
  const [shown, setShown] = useState("");
  const inicio = useRef(0);
  const pulado = useRef(false);

  useEffect(() => {
    pulado.current = false;
    inicio.current = Date.now();
    let frame: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      if (pulado.current) {
        setShown(texto);
        return;
      }
      const decorrido = (Date.now() - inicio.current) / 1000;
      const n = Math.min(texto.length, Math.floor(decorrido * charsPorSegundo));
      setShown(texto.slice(0, n));
      if (n < texto.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [texto, charsPorSegundo]);

  const done = shown.length >= texto.length;
  const skip = () => {
    pulado.current = true;
    setShown(texto);
  };
  return { shown, done, skip };
}
