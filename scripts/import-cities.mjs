// Importa os 5.570 municípios do IBGE (nome, código, UF e polígono) para public.cities.
// Roda na SUA máquina, nunca no app:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-cities.mjs [UF ...]
// Sem argumentos importa todas as UFs. Usa a API de malhas do IBGE com qualidade mínima (~30 MB no total).

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
const wanted = process.argv.slice(2).map((s) => s.toUpperCase());
const ufs = wanted.length ? wanted : UFS;

async function getJson(u) {
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${u}`);
  return r.json();
}

const municipios = await getJson(
  "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado",
);
const byCode = new Map(
  municipios.map((m) => [
    String(m["municipio-id"]),
    { name: m["municipio-nome"], state: m["UF-sigla"] },
  ]),
);

for (const uf of ufs) {
  const fc = await getJson(
    `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima`,
  );
  const rows = [];
  for (const f of fc.features) {
    const code = String(f.properties.codarea);
    const meta = byCode.get(code);
    if (!meta) continue;
    const geom =
      f.geometry.type === "Polygon"
        ? { type: "MultiPolygon", coordinates: [f.geometry.coordinates] }
        : f.geometry;
    rows.push({ ibge_code: Number(code), name: meta.name, state: meta.state, geom });
  }
  const { error } = await supabase.rpc("upsert_cities", { p_rows: rows });
  if (error) throw error;
  console.log(`${uf}: ${rows.length} municípios`);
}
console.log("ok");
