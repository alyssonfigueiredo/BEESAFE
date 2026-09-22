// Importa bairros do OpenStreetMap (relações boundary=administrative admin_level=10) para public.neighborhoods.
// Roda na SUA máquina:
//   node scripts/import-neighborhoods.mjs 4314902 [outro_codigo_ibge ...] [--nivel 9]
// Sem argumentos: todas as capitais. Overpass tem limite de uso; o script espera 5 s entre cidades.

import { createClient } from "@supabase/supabase-js";
import osmtogeojson from "osmtogeojson";

const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const CAPITAIS = [
  1200401, 2704302, 1600303, 1302603, 2927408, 2304400, 5300108, 3205309, 5208707, 2111300, 5103403,
  5002704, 3106200, 1501402, 2507507, 4106902, 2611606, 2211001, 3304557, 2408102, 4314902, 1100205,
  1400100, 4205407, 3550308, 2800308, 1721000,
];
const args = process.argv.slice(2);
// --nivel 9 usa o nível administrativo 9 do OSM (subprefeitura em SP, região administrativa no DF),
// onde o 10 (bairro) não existe.
const iNivel = args.indexOf("--nivel");
const nivel = iNivel >= 0 ? args[iNivel + 1] : "10";
const codes = args.filter((a, i) => /^\d+$/.test(a) && i !== iNivel + 1).map(Number);
const targets = codes.length ? codes : CAPITAIS;

const MIRRORS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

async function overpass(query) {
  let last;
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          Accept: "application/json",
          "User-Agent": "irisa-import/1.0 (https://github.com/alyssonfigueiredo/beesafe)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (r.ok) return r.json();
      last = new Error(`Overpass ${r.status} (${url})`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

async function fetchNeighborhoods(ibge) {
  // Municípios brasileiros no OSM carregam a tag IBGE:GEOCODIGO.
  const query = `
    [out:json][timeout:120];
    area["boundary"="administrative"]["admin_level"="8"]["IBGE:GEOCODIGO"="${ibge}"]->.city;
    (
      relation["boundary"="administrative"]["admin_level"="${nivel}"](area.city);
      relation["place"~"^(suburb|neighbourhood|quarter)$"]["type"="multipolygon"](area.city);
    );
    out body; >; out skel qt;`;
  const osm = await overpass(query);
  const fc = osmtogeojson(osm);
  return fc.features
    .filter((f) => f.properties?.name && /Polygon$/.test(f.geometry?.type ?? ""))
    .map((f) => ({
      name: f.properties.name,
      geom:
        f.geometry.type === "Polygon"
          ? { type: "MultiPolygon", coordinates: [f.geometry.coordinates] }
          : f.geometry,
    }));
}

for (const ibge of targets) {
  try {
    const rows = await fetchNeighborhoods(ibge);
    const { data, error } = await supabase.rpc("upsert_neighborhoods", {
      p_city_ibge: ibge,
      p_rows: rows,
    });
    if (error) throw error;
    console.log(`${ibge}: ${rows.length} áreas no OSM (nível ${nivel}), ${data ?? 0} gravadas`);
  } catch (e) {
    console.error(`${ibge}: falhou —`, e.message);
  }
  await new Promise((res) => setTimeout(res, 5000));
}
console.log("ok");
