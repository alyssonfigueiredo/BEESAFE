// Semeia public.places com estabelecimentos REAIS do OpenStreetMap (nome, endereço, coordenada).
// Entram sem nota nenhuma: servem só para o mapa não abrir vazio; quem avalia é a comunidade.
// Roda na SUA máquina, nunca no app:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-places-osm.mjs [ibge] [--limite N] [--bairros "Centro,Batel"]
// Sem argumentos: Curitiba (4106902), 60 lugares, sem filtro de bairro.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const ibge = Number(args.find((a) => /^\d+$/.test(a))) || 4106902;
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const limite = Number(flag("limite")) || 60;
const bairros = (flag("bairros") ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Ordem de prioridade quando há mais lugares que o limite: o que a comunidade mais avalia primeiro.
const CATEGORIAS = {
  bar: "bar",
  pub: "bar",
  nightclub: "balada",
  cafe: "cafe",
  restaurant: "restaurante",
  hotel: "hotel",
};
const PRIORIDADE = ["bar", "balada", "cafe", "restaurante", "hotel"];

const MIRRORS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

async function overpass(query) {
  let last;
  for (const mirror of MIRRORS) {
    try {
      const r = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          Accept: "application/json",
          "User-Agent": "irisa-import/1.0 (https://github.com/alyssonfigueiredo/beesafe)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (r.ok) return r.json();
      last = new Error(`Overpass ${r.status} (${mirror})`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

// A tag lgbtq marca lugar da cena ou que se declara acolhedor. Esses entram mesmo sem endereço:
// são os que a comunidade mais procura, e o endereço dá para completar depois.
const query = `
  [out:json][timeout:180];
  area["boundary"="administrative"]["admin_level"="8"]["IBGE:GEOCODIGO"="${ibge}"]->.cidade;
  (
    nwr["amenity"~"^(bar|pub|cafe|restaurant|nightclub)$"]["name"]["addr:street"](area.cidade);
    nwr["tourism"="hotel"]["name"]["addr:street"](area.cidade);
    nwr["lgbtq"]["name"](area.cidade);
    nwr["lgbtq:primary"]["name"](area.cidade);
  );
  out center tags;`;

const osm = await overpass(query);

const candidatos = [];
for (const el of osm.elements) {
  const t = el.tags ?? {};
  const daCena = !!(t.lgbtq || t["lgbtq:primary"]);
  const categoria =
    CATEGORIAS[t.amenity] ?? (t.tourism === "hotel" ? "hotel" : daCena ? "outro" : null);
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!categoria || !t.name || lat == null || lon == null) continue;
  const bairro = (t["addr:suburb"] ?? t["addr:neighbourhood"] ?? "").toLowerCase();
  if (bairros.length && !bairros.includes(bairro)) continue;
  const nome = t.name.trim().slice(0, 80);
  if (nome.length < 2) continue;
  const endereco = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ").slice(0, 200);
  candidatos.push({ nome, categoria, endereco, lat, lon, daCena });
}

// O OSM repete o mesmo estabelecimento em nó e polígono: um por nome.
const porNome = new Map();
for (const c of candidatos) if (!porNome.has(c.nome.toLowerCase())) porNome.set(c.nome.toLowerCase(), c);

const { data: cidade, error: erroCidade } = await supabase
  .from("cities")
  .select("id, name")
  .eq("ibge_code", ibge)
  .single();
if (erroCidade) throw erroCidade;

const { data: jaExistem, error: erroExistentes } = await supabase
  .from("places")
  .select("name")
  .eq("city_id", cidade.id);
if (erroExistentes) throw erroExistentes;
for (const p of jaExistem ?? []) porNome.delete(p.name.trim().toLowerCase());

// Lugares da cena primeiro: são os que a comunidade procura e os que dão sentido ao mapa.
// A tag não vira rótulo no app — só decide quem entra quando há mais candidatos que o limite.
const escolhidos = [...porNome.values()]
  .sort(
    (a, b) =>
      Number(b.daCena) - Number(a.daCena) ||
      PRIORIDADE.indexOf(a.categoria) - PRIORIDADE.indexOf(b.categoria),
  )
  .slice(0, limite);

if (!escolhidos.length) {
  console.log(`${cidade.name}: nada novo a inserir.`);
  process.exit(0);
}

const linhas = escolhidos.map((c) => ({
  name: c.nome,
  category: c.categoria,
  address: c.endereco || null,
  location: `SRID=4326;POINT(${c.lon} ${c.lat})`,
  verified: false,
}));

const { error } = await supabase.from("places").insert(linhas);
if (error) throw error;

const contagem = {};
for (const c of escolhidos) contagem[c.categoria] = (contagem[c.categoria] ?? 0) + 1;
const totalDaCena = escolhidos.filter((c) => c.daCena).length;
console.log(
  `${cidade.name}: ${escolhidos.length} lugares inseridos (${totalDaCena} com tag lgbtq no OSM)`,
);
console.log(
  Object.entries(contagem)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n"),
);
