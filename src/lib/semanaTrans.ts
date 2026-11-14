// Semana de Conscientização Trans (13–19/11) e Dia da Memória Trans (20/11), 2026.
// Só a data do aparelho; nada no banco. Os componentes ficam em `src/components/SemanaTrans.tsx`.
export type FaseTrans = "semana" | "memoria" | null;

const INICIO = "2026-11-13";
const FIM_SEMANA = "2026-11-19";
const MEMORIA = "2026-11-20";

function hojeISO(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function faseTrans(d = new Date()): FaseTrans {
  const h = hojeISO(d);
  if (h >= INICIO && h <= FIM_SEMANA) return "semana";
  if (h === MEMORIA) return "memoria";
  return null;
}
