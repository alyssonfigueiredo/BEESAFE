// Gera supabase/functions/irise-orchestrator/catalogo.ts a partir de src/lib/medals.ts e src/lib/niveis.ts,
// para o irise responder "quais medalhas tenho / quais faltam / quanto falta pro próximo nível" com os
// mesmos nomes e condições que o app mostra. Rodar de novo quando mudar medalha ou nível:
//   node scripts/irise-catalogo.mjs
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { transform } = require("sucrase");

const dir = mkdtempSync(join(tmpdir(), "irise-cat-"));
function carregar(arq) {
  let src = readFileSync(arq, "utf8");
  src = src.replace(/^import .*$/gm, ""); // os dois arquivos não importam nada que o catálogo precise
  const js = transform(src, { transforms: ["typescript", "imports"] }).code;
  const f = join(dir, arq.replace(/\W/g, "_") + ".cjs");
  writeFileSync(f, js);
  return require(f);
}
const { MEDALHAS, LANCAMENTO } = carregar("src/lib/medals.ts");
const { NIVEIS_EVO: NIVEIS } = carregar("src/lib/niveis.ts");
const noApp = new Set(LANCAMENTO);
const medalhas = Object.fromEntries(
  MEDALHAS.filter((m) => noApp.has(m.id)).map((m) => [m.id, { t: m.flex ?? [m.t], cond: m.cond }]),
);
const niveis = NIVEIS.map((n) => ({ f: n.f, g: n.g }));
writeFileSync(
  "supabase/functions/irise-orchestrator/catalogo.ts",
  `// GERADO por scripts/irise-catalogo.mjs a partir de src/lib/medals.ts e src/lib/niveis.ts. Não editar à mão.\n` +
    `export const MEDALHAS: Record<string, { t: string[]; cond: string }> = ${JSON.stringify(medalhas, null, 1)};\n` +
    `export const NIVEIS: { f: string[]; g: number }[] = ${JSON.stringify(niveis)};\n`,
);
console.log(`${Object.keys(medalhas).length} medalhas, ${niveis.length} níveis`);
