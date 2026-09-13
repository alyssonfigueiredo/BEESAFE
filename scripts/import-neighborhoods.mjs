// Importa bairros do OpenStreetMap (relações boundary=administrative admin_level=10) para public.neighborhoods.
// Roda na SUA máquina:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-neighborhoods.mjs 4314902 [outro_codigo_ibge ...]
// Sem argumentos: todas as capitais. Overpass tem limite de uso; o script espera 5 s entre cidades.

import { createClient } from "@supabase/supabase-js";
import osmtogeojson from "osmtogeojson";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const CAPITAIS = [
  1200401, 2704302, 1600303, 1302603, 2927408, 2304400, 5300108, 3205309, 5208707, 2111300, 5103403, 5002704,
  3106200, 1501402, 2507507, 4106902, 2611606, 2211001, 3304557, 2408102, 4314902, 1100205, 1400100, 4205407,
  3550308, 2800308, 1721000,
];
const codes = process.argv.slice(2).map(Number).filter(Boolean);
const targets = codes.length ? codes : CAPITAIS;

const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

async function fetchNeighborhoods(ibge) {
  // Municípios brasileiros no OSM carregam a tag IBGE:GEOCODIGO.
  const query = `
    [out:json][timeout:120];
    area["boundary"="administrative"]["admin_level"="8"]["IBGE:GEOCODIGO"="${ibge}"]->.city;
    (
      relation["boundary"="administrative"]["admin_level"="10"](area.city);
      relation["place"~"^(suburb|neighbourhood|quarter)$"]["type"="multipolygon"](area.city);
    );
    out body; >; out skel qt;`;
  const r = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(query) });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  const osm = await r.json();
  const fc = osmtogeojson(osm);
  return fc.features
    .filter((f) => f.properties?.name && /Polygon$/.test(f.geometry?.type ?? ""))
    .map((f) => ({
      name: f.properties.name,
      geom: f.geometry.type === "Polygon" ? { type: "MultiPolygon", coordinates: [f.geometry.coordinates] } : f.geometry,
    }));
}

for (const ibge of targets) {
  try {
    const rows = await fetchNeighborhoods(ibge);
    const { data, error } = await supabase.rpc("upsert_neighborhoods", { p_city_ibge: ibge, p_rows: rows });
    if (error) throw error;
    console.log(`${ibge}: ${rows.length} bairros no OSM, ${data ?? 0} gravados`);
  } catch (e) {
    console.error(`${ibge}: falhou —`, e.message);
  }
  await new Promise((res) => setTimeout(res, 5000));
}
console.log("ok");
