// Importa bairros do OpenStreetMap (relações boundary=administrative admin_level=10) para public.neighborhoods.
// Roda na SUA máquina:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-neighborhoods.mjs 4314902 [outro_codigo_ibge ...]
// Sem argumentos: todas as capitais. O município precisa já estar em public.cities (scripts/import-cities.mjs).
// Overpass tem limite de uso: 5 s entre cidades e uma segunda tentativa no fim para as que falharem.

import { createClient } from "@supabase/supabase-js";
import osmtogeojson from "osmtogeojson";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const CAPITAIS = [
  1200401, 2704302, 1600303, 1302603, 2927408, 2304400, 5300108, 3205309, 5208707, 2111300, 5103403,
  5002704, 3106200, 1501402, 2507507, 4106902, 2611606, 2211001, 3304557, 2408102, 4314902, 1100205,
  1400100, 4205407, 3550308, 2800308, 1721000,
];
const codes = process.argv.slice(2).map(Number).filter(Boolean);
const requested = codes.length ? codes : CAPITAIS;

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
      relation["boundary"="administrative"]["admin_level"="10"](area.city);
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

// O município precisa existir em public.cities (upsert_neighborhoods exige). Avisa em vez de falhar 27 vezes.
const { data: known, error: knownError } = await supabase
  .from("cities")
  .select("ibge_code, name, state")
  .in("ibge_code", requested);
if (knownError) throw knownError;

const byCode = new Map((known ?? []).map((c) => [c.ibge_code, c]));
const missing = requested.filter((c) => !byCode.has(c));
const targets = requested.filter((c) => byCode.has(c));

if (missing.length) {
  console.warn(
    `Fora da tabela cities (rode scripts/import-cities.mjs antes): ${missing.join(", ")}`,
  );
}
if (!targets.length) {
  console.error("Nenhum município importado entre os pedidos. Rode: node scripts/import-cities.mjs");
  process.exit(1);
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function importOne(ibge) {
  const rows = await fetchNeighborhoods(ibge);
  const { data, error } = await supabase.rpc("upsert_neighborhoods", {
    p_city_ibge: ibge,
    p_rows: rows,
  });
  if (error) throw error;
  return { found: rows.length, saved: data ?? 0 };
}

const failed = [];
for (const ibge of targets) {
  const city = byCode.get(ibge);
  const label = `${city.name}/${city.state} (${ibge})`;
  try {
    const { found, saved } = await importOne(ibge);
    console.log(`${label}: ${found} bairros no OSM, ${saved} gravados`);
  } catch (e) {
    console.error(`${label}: falhou — ${e.message}`);
    failed.push(ibge);
  }
  await sleep(5000);
}

// Overpass derruba requisição por excesso de uso; uma segunda passada costuma resolver.
if (failed.length) {
  console.log(`\nSegunda tentativa em ${failed.length} cidade(s)...`);
  const stillFailed = [];
  for (const ibge of failed) {
    const city = byCode.get(ibge);
    const label = `${city.name}/${city.state} (${ibge})`;
    await sleep(15000);
    try {
      const { found, saved } = await importOne(ibge);
      console.log(`${label}: ${found} bairros no OSM, ${saved} gravados`);
    } catch (e) {
      console.error(`${label}: falhou de novo — ${e.message}`);
      stillFailed.push(ibge);
    }
  }
  if (stillFailed.length) {
    console.error(
      `\nNão importados: ${stillFailed.join(" ")}\nRode de novo só eles: node scripts/import-neighborhoods.mjs ${stillFailed.join(" ")}`,
    );
    process.exit(1);
  }
}
console.log("ok");
