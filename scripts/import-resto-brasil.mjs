// Importa (via Overture, scripts/import-places-overture.mjs) TODOS os municípios do Brasil que ainda
// não têm nenhum lugar no banco — ou seja, o resto, fora as capitais e as regiões metropolitanas já
// importadas. Busca a lista sozinho (cities menos quem já tem places), não precisa colar código IBGE.
//
// Roda na SUA máquina, de preferência em segundo plano (são ~5 mil municípios, muitas horas):
//   set -a && source .env.scripts && set +a
//   nohup node scripts/import-resto-brasil.mjs > import-resto.log 2>&1 &
//   disown
//
// Flags: --simular (só lista quantos faltam, não importa nada), --limite 200 (repassado pro import),
// --desde 3500000 (pula direto para um código IBGE, para retomar depois de uma parada no meio).
// Continua para o próximo mesmo se um município der erro (malha do IBGE fora do ar, etc.) e mostra
// o resumo no fim. Zero custo: Overture é gratuito, não chama a API do Google.

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const simular = args.includes("--simular");
const desdeFlagIdx = args.indexOf("--desde");
const desde = desdeFlagIdx >= 0 ? Number(args[desdeFlagIdx + 1]) : 0;
// repassa pro import-places-overture.mjs tudo que não for --simular nem --desde (e seu valor)
const passthrough = args.filter((a, i) =>
  a !== "--simular" && a !== "--desde" && i !== desdeFlagIdx + 1
);

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log("Buscando municípios sem nenhum lugar no banco...");

// Todos os municípios (paginado: o Supabase limita a 1000 linhas por select)
const cidades = [];
{
  let from = 0;
  const pagina = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("cities")
      .select("id, ibge_code, name, state")
      .order("ibge_code")
      .range(from, from + pagina - 1);
    if (error) throw error;
    cidades.push(...data);
    if (data.length < pagina) break;
    from += pagina;
  }
}

// Municípios que já têm pelo menos 1 lugar (pega todos os city_id distintos, paginando)
const comLugar = new Set();
let from = 0;
const pagina = 1000;
for (;;) {
  const { data, error } = await supabase
    .from("places")
    .select("city_id")
    .range(from, from + pagina - 1);
  if (error) throw error;
  if (!data.length) break;
  for (const r of data) comLugar.add(r.city_id);
  if (data.length < pagina) break;
  from += pagina;
}

const faltam = cidades.filter((c) => !comLugar.has(c.id) && c.ibge_code >= desde);
console.log(`${cidades.length} municípios no total, ${comLugar.size} já têm lugar, ${faltam.length} faltam.\n`);

if (simular) {
  console.log(faltam.map((c) => `${c.ibge_code}  ${c.name}/${c.state}`).join("\n"));
  process.exit(0);
}

const resultados = [];
for (const c of faltam) {
  console.log(`\n=== ${c.name}/${c.state} (${c.ibge_code}) ===`);
  const r = spawnSync("node", ["scripts/import-places-overture.mjs", String(c.ibge_code), ...passthrough], {
    stdio: "inherit",
    env: process.env,
  });
  resultados.push({ nome: `${c.name}/${c.state}`, ibge: c.ibge_code, ok: r.status === 0 });
}

console.log("\n=== Resumo ===");
const falhas = resultados.filter((r) => !r.ok);
console.log(`${resultados.length - falhas.length} OK, ${falhas.length} falharam.`);
if (falhas.length) {
  console.log("\nPara rodar de novo só os que falharam:");
  console.log(falhas.map((f) => `node scripts/import-places-overture.mjs ${f.ibge}`).join("\n"));
}
