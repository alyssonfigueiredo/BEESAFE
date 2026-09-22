// Importa os distritos do IBGE como bairros, para as cidades que o OpenStreetMap não cobre.
// Roda na SUA máquina:
//   set -a && source .env.scripts && set +a && node scripts/import-districts-ibge.mjs 3550308 [outro_ibge ...]
// Cidade com um distrito só (o próprio município, como Brasília) é ignorada: não serve de bairro.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const alvos = process.argv.slice(2).map(Number).filter(Boolean);
if (!alvos.length) throw new Error("Passe ao menos um código IBGE. Ex.: node scripts/import-districts-ibge.mjs 3550308");

const IBGE = "https://servicodados.ibge.gov.br/api";

async function json(endereco) {
  const r = await fetch(endereco, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`IBGE ${r.status} em ${endereco}`);
  return r.json();
}

for (const ibge of alvos) {
  try {
    const distritos = await json(`${IBGE}/v1/localidades/municipios/${ibge}/distritos`);
    if (distritos.length < 2) {
      console.log(`${ibge}: ${distritos.length} distrito — o IBGE não separa bairros aqui, pulando`);
      continue;
    }
    const nomePorCodigo = new Map(distritos.map((d) => [String(d.id), d.nome]));

    const malha = await json(
      `${IBGE}/v4/malhas/municipios/${ibge}?formato=application/vnd.geo+json&intrarregiao=distrito`,
    );
    const rows = [];
    for (const f of malha.features ?? []) {
      const nome = nomePorCodigo.get(String(f.properties?.codarea));
      const tipo = f.geometry?.type;
      if (!nome || !/Polygon$/.test(tipo ?? "")) continue;
      rows.push({
        name: nome,
        geom:
          tipo === "Polygon"
            ? { type: "MultiPolygon", coordinates: [f.geometry.coordinates] }
            : f.geometry,
      });
    }

    const { data, error } = await supabase.rpc("upsert_neighborhoods", {
      p_city_ibge: ibge,
      p_rows: rows,
    });
    if (error) throw error;
    console.log(`${ibge}: ${distritos.length} distritos, ${rows.length} com malha, ${data ?? 0} gravados`);
  } catch (e) {
    console.error(`${ibge}: falhou —`, e.message);
  }
}
console.log("ok");
