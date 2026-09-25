// Semeia public.places com estabelecimentos REAIS do Overture Maps (base aberta mantida por Meta,
// Microsoft, Amazon e TomTom; licença CDLA-Permissive 2.0, pode ficar no nosso banco). Cobre muito
// mais que o OSM no Brasil porque boa parte vem das páginas do Facebook. Entram sem nota nenhuma.
// Roda na SUA máquina (ou no workflow Importar cidade), nunca no app:
//   set -a && source .env.scripts && set +a
//   node scripts/import-places-overture.mjs <ibge> [--limite N] [--confianca 0.5] [--simular]
// Sem --limite entra tudo que passar nos filtros. --simular só conta, não grava nada (dispensa a chave).
// Lê direto dos arquivos Parquet no S3 público do Overture, só os blocos que cruzam a caixa da
// cidade (JS puro, sem binário): uma capital leva de 1 a 3 minutos e uns 200 MB de rede.

import { parquetMetadataAsync, parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const ibge = Number(args.find((a) => /^\d{7}$/.test(a)));
if (!ibge) throw new Error("Informe o código IBGE da cidade (7 dígitos). Ex.: 4106902");
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const simular = args.includes("--simular");
const limite = Number(flag("limite")) || Infinity;
// Overture: abaixo de 0.5 a própria fonte diz que o lugar pode não existir mais (página abandonada).
const confiancaMinima = Number(flag("confianca") ?? 0.5);
const malhaLocal = flag("malha"); // GeoJSON do município já baixado (teste sem internet do IBGE)
const releaseFixo = flag("release"); // ex.: 2026-09-23.0; sem isso usa o mais novo

const BASE = "https://overturemaps-us-west-2.s3.amazonaws.com/";

// ---------- categoria: a taxonomia do Overture cai nas nossas cinco ----------
// Motel entra como hotel de propósito: recusa de casal do mesmo sexo em motel é queixa comum.
// Casa noturna adulta (strip club etc.) fica de fora. Padaria e sorveteria entram como café: no
// Brasil são onde a gente senta.
function categoria(hierarquia) {
  const h = (hierarquia ?? []).join(">");
  if (!h) return null;
  if (/adult_entertainment|strip_club/.test(h)) return null;
  if (/^lodging>(hotel|hostel|bed_and_breakfast|inn|resort|motel|lodge)/.test(h)) return "hotel";
  if (/nightlife_venue|dance_club|music_venue/.test(h)) return "balada";
  if (/alcoholic_beverage_venue|gastropub/.test(h) && !/non_alcoholic/.test(h)) return "bar";
  if (/coffee_shop|>cafe|tea_room|bubble_tea|smoothie_juice_bar|dessert_shop|bakery/.test(h)) return "cafe";
  if (/^food_and_drink>(restaurant|casual_eatery)/.test(h) && !/candy_store/.test(h)) return "restaurante";
  return null;
}
const PRIORIDADE = ["bar", "balada", "cafe", "restaurante", "hotel"];

// ---------- polígono do município (IBGE) ----------
async function malhaMunicipio() {
  if (malhaLocal) return JSON.parse(readFileSync(malhaLocal, "utf8"));
  const u = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${ibge}?formato=application/vnd.geo+json&qualidade=minima`;
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`IBGE ${r.status} ao baixar a malha do município ${ibge}`);
  return r.json();
}
function aneis(geojson) {
  const geoms = [];
  const empurra = (g) => {
    if (!g) return;
    if (g.type === "Polygon") geoms.push(g.coordinates);
    else if (g.type === "MultiPolygon") geoms.push(...g.coordinates);
    else if (g.type === "GeometryCollection") g.geometries.forEach(empurra);
  };
  if (geojson.type === "FeatureCollection") geojson.features.forEach((f) => empurra(f.geometry));
  else if (geojson.type === "Feature") empurra(geojson.geometry);
  else empurra(geojson);
  if (!geoms.length) throw new Error("Malha sem polígono");
  return geoms; // lista de polígonos, cada um = [anel externo, ...buracos]
}
function dentroDoAnel([x, y], anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
function dentroDoMunicipio(p, poligonos) {
  return poligonos.some(([externo, ...buracos]) => dentroDoAnel(p, externo) && !buracos.some((b) => dentroDoAnel(p, b)));
}
function caixa(poligonos) {
  const bb = { xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity };
  for (const pol of poligonos)
    for (const [x, y] of pol[0]) {
      bb.xmin = Math.min(bb.xmin, x); bb.xmax = Math.max(bb.xmax, x);
      bb.ymin = Math.min(bb.ymin, y); bb.ymax = Math.max(bb.ymax, y);
    }
  return bb;
}

// ---------- Overture no S3 ----------
async function listar(prefixo) {
  const chaves = [];
  let token = "";
  do {
    const u = `${BASE}?list-type=2&prefix=${encodeURIComponent(prefixo)}${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`S3 ${r.status} ao listar ${prefixo}`);
    const xml = await r.text();
    chaves.push(...[...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]));
    token = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] ?? "";
  } while (token);
  return chaves;
}
async function releaseMaisNovo() {
  if (releaseFixo) return releaseFixo;
  const r = await fetch(`${BASE}?list-type=2&prefix=release/&delimiter=/`);
  const xml = await r.text();
  const rels = [...xml.matchAll(/<Prefix>release\/([^<\/]+)\/<\/Prefix>/g)].map((m) => m[1]).sort();
  if (!rels.length) throw new Error("Nenhum release do Overture encontrado");
  return rels[rels.length - 1];
}

const COLUNAS = ["id", "names", "taxonomy", "confidence", "operating_status", "addresses", "bbox"];

// O S3 fecha a conexão no meio de leituras longas ("other side closed"): cada pedaço do arquivo
// é pedido de novo até 5 vezes antes de desistir, em vez de derrubar a cidade inteira.
async function comRetentativa(fn, rotulo) {
  let ultimo;
  for (let i = 0; i < 5; i++) {
    try { return await fn(); }
    catch (e) { ultimo = e; await new Promise((r) => setTimeout(r, 1000 * 2 ** i)); }
  }
  throw new Error(`${rotulo}: ${ultimo?.cause?.message ?? ultimo?.message ?? ultimo}`);
}
async function arquivoRemoto(url) {
  const cabeca = await comRetentativa(() => fetch(url, { method: "HEAD" }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; }), url);
  const byteLength = Number(cabeca.headers.get("content-length"));
  return {
    byteLength,
    slice: (inicio, fim = byteLength) =>
      comRetentativa(async () => {
        const r = await fetch(url, { headers: { Range: `bytes=${inicio}-${fim - 1}` } });
        if (r.status !== 206 && r.status !== 200) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      }, `${url.slice(-30)} bytes ${inicio}-${fim}`),
  };
}

async function lugaresNaCaixa(release, bb) {
  const arquivos = (await listar(`release/${release}/theme=places/type=place/`)).filter((k) => k.endsWith(".parquet"));
  const achados = [];
  let blocos = 0;
  for (const chave of arquivos) {
    const file = await arquivoRemoto(BASE + chave);
    const meta = await parquetMetadataAsync(file);
    const caminhos = meta.row_groups[0].columns.map((c) => c.meta_data.path_in_schema.join("."));
    const ix = caminhos.indexOf("bbox.xmin");
    const iy = caminhos.indexOf("bbox.ymin");
    let linha = 0;
    for (const rg of meta.row_groups) {
      const n = Number(rg.num_rows);
      const sx = rg.columns[ix].meta_data.statistics;
      const sy = rg.columns[iy].meta_data.statistics;
      const cruza = sx && sy && !(sx.max_value < bb.xmin || sx.min_value > bb.xmax || sy.max_value < bb.ymin || sy.min_value > bb.ymax);
      if (cruza) {
        blocos++;
        const rows = await parquetReadObjects({ file, compressors, columns: COLUNAS, rowStart: linha, rowEnd: linha + n });
        for (const r of rows) {
          const x = (r.bbox.xmin + r.bbox.xmax) / 2;
          const y = (r.bbox.ymin + r.bbox.ymax) / 2;
          if (x >= bb.xmin && x <= bb.xmax && y >= bb.ymin && y <= bb.ymax) achados.push({ ...r, x, y });
        }
        process.stdout.write(`\r  lendo Overture: ${blocos} blocos, ${achados.length} lugares na caixa   `);
      }
      linha += n;
    }
  }
  process.stdout.write("\n");
  return achados;
}

const chave = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const metros = (a, b) => {
  const R = 6371000, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// ---------- fluxo ----------
const poligonos = aneis(await malhaMunicipio());
const bb = caixa(poligonos);
const release = await releaseMaisNovo();
console.log(`Overture ${release}, município ${ibge}, caixa ${bb.xmin.toFixed(2)},${bb.ymin.toFixed(2)} a ${bb.xmax.toFixed(2)},${bb.ymax.toFixed(2)}`);

const brutos = await lugaresNaCaixa(release, bb);
const candidatos = [];
const descartes = { categoria: 0, confianca: 0, fechado: 0, foraDoMunicipio: 0, semNome: 0 };
for (const r of brutos) {
  const cat = categoria(r.taxonomy?.hierarchy);
  if (!cat) { descartes.categoria++; continue; }
  if (!(r.confidence >= confiancaMinima)) { descartes.confianca++; continue; }
  if (r.operating_status && r.operating_status !== "open") { descartes.fechado++; continue; }
  const nome = (r.names?.primary ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (nome.length < 2) { descartes.semNome++; continue; }
  if (!dentroDoMunicipio([r.x, r.y], poligonos)) { descartes.foraDoMunicipio++; continue; }
  const daCena = /gay|lgbt/.test(JSON.stringify(r.taxonomy ?? ""));
  const endereco = (r.addresses?.[0]?.freeform ?? "").trim().slice(0, 200);
  candidatos.push({ nome, categoria: cat, endereco, lat: r.y, lon: r.x, daCena, confianca: r.confidence });
}

// O Overture repete estabelecimento (página duplicada no Facebook): mesmo nome a menos de 150 m,
// fica o de maior confiança. Rede com várias unidades (nomes iguais longe uma da outra) entra toda.
candidatos.sort((a, b) => b.confianca - a.confianca);
const porChave = new Map();
const unicos = [];
let repetidos = 0;
for (const c of candidatos) {
  const k = chave(c.nome);
  const iguais = porChave.get(k) ?? [];
  if (iguais.some((o) => metros(o, c) < 150)) { repetidos++; continue; }
  iguais.push(c); porChave.set(k, iguais); unicos.push(c);
}

console.log(
  `${brutos.length} na caixa → ${unicos.length} candidatos ` +
  `(fora da categoria ${descartes.categoria}, confiança < ${confiancaMinima}: ${descartes.confianca}, ` +
  `fechados ${descartes.fechado}, fora do município ${descartes.foraDoMunicipio}, repetidos ${repetidos})`,
);

// Ordem de prioridade quando há limite: da cena primeiro, depois quem tem endereço; revezando categorias.
unicos.sort((a, b) => Number(b.daCena) - Number(a.daCena) || Number(!!b.endereco) - Number(!!a.endereco) || b.confianca - a.confianca);

if (simular) {
  const contagem = {};
  for (const c of unicos) contagem[c.categoria] = (contagem[c.categoria] ?? 0) + 1;
  console.log("Simulação (nada gravado):");
  console.log(Object.entries(contagem).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
  console.log(`  da cena: ${unicos.filter((c) => c.daCena).map((c) => c.nome).join(", ") || "nenhum"}`);
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: cidade, error: erroCidade } = await supabase.from("cities").select("id, name").eq("ibge_code", ibge).single();
if (erroCidade) throw erroCidade;

// Quem já está no banco (OSM ou usuário) com nome parecido a menos de 150 m nem tenta: é o
// mesmo critério do trigger anti-duplicata, só que sem gastar uma chamada por lugar.
const existentes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await supabase
    .from("public_places").select("name, latitude, longitude").eq("city_id", cidade.id).range(de, de + 999);
  if (error) throw error;
  existentes.push(...(data ?? []).map((p) => ({ k: chave(p.name), lat: p.latitude, lon: p.longitude })));
  if (!data || data.length < 1000) break;
}
const existentesPorChave = new Map();
for (const e of existentes) existentesPorChave.set(e.k, [...(existentesPorChave.get(e.k) ?? []), e]);
const novos = unicos.filter((c) => !(existentesPorChave.get(chave(c.nome)) ?? []).some((e) => metros(e, c) < 150));

const filas = new Map(PRIORIDADE.map((c) => [c, novos.filter((p) => p.categoria === c)]));
const escolhidos = [];
while (escolhidos.length < limite) {
  const rodada = [...filas.values()].map((f) => f.shift()).filter(Boolean);
  if (!rodada.length) break;
  escolhidos.push(...rodada.slice(0, limite - escolhidos.length));
}
if (!escolhidos.length) {
  console.log(`${cidade.name}: nada novo a inserir (${existentes.length} já no banco).`);
  process.exit(0);
}
console.log(`${cidade.name}: ${existentes.length} já no banco, ${escolhidos.length} a inserir…`);

const linha = (c) => ({
  name: c.nome, category: c.categoria, address: c.endereco || null,
  location: `SRID=4326;POINT(${c.lon} ${c.lat})`, verified: false,
});
const inseridos = [];
const motivos = new Map();
const LOTE = 100;
for (let i = 0; i < escolhidos.length; i += LOTE) {
  const lote = escolhidos.slice(i, i + LOTE);
  const { error: erroLote } = await supabase.from("places").insert(lote.map(linha));
  if (!erroLote) { inseridos.push(...lote); }
  else {
    for (const c of lote) {
      let { error } = await supabase.from("places").insert(linha(c));
      if (error && /timeout/i.test(error.message)) ({ error } = await supabase.from("places").insert(linha(c)));
      if (error) {
        const m = error.code === "P0004" ? "parecido com um lugar que já existe a menos de 150 m" : error.message.replace(/".*?"/g, "…");
        motivos.set(m, [...(motivos.get(m) ?? []), c.nome]);
      } else inseridos.push(c);
    }
  }
  process.stdout.write(`\r  gravando: ${Math.min(i + LOTE, escolhidos.length)}/${escolhidos.length}, ${inseridos.length} inseridos   `);
}
process.stdout.write("\n");

const contagem = {};
for (const c of inseridos) contagem[c.categoria] = (contagem[c.categoria] ?? 0) + 1;
console.log(`${cidade.name}: ${inseridos.length} lugares inseridos do Overture (${inseridos.filter((c) => c.daCena).length} da cena)`);
console.log(Object.entries(contagem).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
if (motivos.size) {
  console.log("  recusados pelo banco:");
  for (const [m, nomes] of motivos) console.log(`    ${nomes.length}× ${m}`);
}
if (!inseridos.length) process.exit(1);
