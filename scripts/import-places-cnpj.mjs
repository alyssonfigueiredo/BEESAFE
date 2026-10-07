// Importa lugares da base aberta do CNPJ (Receita Federal) para municípios sem cobertura do Overture.
// Baixa Municipios.zip (referência RF→nome) e Estabelecimentos{0-9}.zip (stream), filtra por CNAE
// e situação ativa, e insere no banco usando o centróide de cities.centroid.
// Licença dos dados: domínio público (Lei 12.527/2011 + Lei Geral de Proteção de Dados).
//
// Roda na SUA máquina:
//   set -a && source .env.scripts && set +a
//   node scripts/import-places-cnpj.mjs [--uf RS] [--limite 20] [--partes 0,1] [--simular]
//
// --uf       processa só esse estado (ex.: RS, SP, MG)
// --limite   máx de lugares por município (padrão 20)
// --partes   quais arquivos 0–9 processar (padrão todos; útil para retomar)
// --simular  mostra quantos candidatos encontraria por município, sem gravar

import { createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const simular = args.includes("--simular");
const ufFiltro = flag("uf")?.toUpperCase();
const limite = Number(flag("limite") ?? 20);
const partesArg = flag("partes");
const partes = partesArg ? partesArg.split(",").map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// ---------- CNAE principal → categoria ----------
const CNAES = {
  5611201: "restaurante", 5620101: "restaurante", 5620102: "restaurante",
  5611202: "bar", 5611204: "bar",
  5611203: "cafe", 4721104: "cafe", 1091102: "cafe",
  9329801: "balada", 9001903: "balada",
  5510801: "hotel", 5510802: "hotel", 5510803: "hotel",
  5590601: "hotel", 5590602: "hotel", 5590603: "hotel", 5590699: "hotel",
};

// ---------- URL da Receita Federal ----------
const BASE_RF = "https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/";

async function releaseRF() {
  const r = await fetch(BASE_RF);
  if (!r.ok) throw new Error(`RF HTTP ${r.status}`);
  const html = await r.text();
  const matches = [...html.matchAll(/href="(\d{4}-\d{2})\/"/g)].map((m) => m[1]).sort();
  if (!matches.length) throw new Error("Nenhum release da RF encontrado em " + BASE_RF);
  return matches[matches.length - 1];
}

// ---------- download (com progresso) ----------
async function baixar(url, destino) {
  process.stdout.write(`  baixando ${url.split("/").pop()}…`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ao baixar ${url}`);
  const total = Number(r.headers.get("content-length") || 0);
  let baixado = 0;
  const ws = createWriteStream(destino);
  const reader = r.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      ws.write(Buffer.from(value));
      baixado += value.length;
      if (total) process.stdout.write(`\r  baixando ${url.split("/").pop()}: ${(baixado / 1e6).toFixed(0)}/${(total / 1e6).toFixed(0)} MB   `);
    }
    ws.end();
    await new Promise((res, rej) => ws.on("finish", res).on("error", rej));
    process.stdout.write("\n");
  } catch (e) { ws.destroy(); throw e; }
}

// ---------- stream de linhas de um ZIP (unzip -p → stdout) ----------
async function* linhasDoZip(zipPath) {
  const proc = spawn("unzip", ["-p", zipPath], { stdio: ["ignore", "pipe", "inherit"] });
  const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
  for await (const linha of rl) yield linha;
  await new Promise((res) => proc.on("close", res));
}

// ---------- normaliza nome para matching ----------
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

// ---------- parse simples de linha CSV (separador ';', campos podem ter aspas) ----------
function parseLinha(linha) {
  const campos = [];
  let atual = "";
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') { dentro = !dentro; continue; }
    if (c === ";" && !dentro) { campos.push(atual); atual = ""; continue; }
    atual += c;
  }
  campos.push(atual);
  return campos;
}

// ---------- fluxo principal ----------
const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (set -a && source .env.scripts && set +a)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log("Carregando municípios-alvo (sem lugares no banco)…");

// Todos os city_ids que já têm lugar
const comLugar = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("places").select("city_id").range(from, from + 999);
  if (error) throw error;
  for (const r of data) comLugar.add(r.city_id);
  if (data.length < 1000) break;
}

// Cidades-alvo: sem lugar + (uf opcional)
const cidadesPorNormUF = new Map(); // "NOME NORM|UF" → cidade
const cidadesPorId = new Map();
for (let from = 0; ; from += 1000) {
  let q = supabase.from("cities")
    .select("id, ibge_code, name, state")
    .order("ibge_code")
    .range(from, from + 999);
  if (ufFiltro) q = q.eq("state", ufFiltro);
  const { data, error } = await q;
  if (error) throw error;
  for (const c of data) {
    if (comLugar.has(c.id)) continue;
    const chave = `${norm(c.name)}|${c.state}`;
    cidadesPorNormUF.set(chave, c);
    cidadesPorId.set(c.id, c);
  }
  if (data.length < 1000) break;
}
console.log(`${cidadesPorNormUF.size} municípios-alvo.`);

// Pré-carrega todos os centróides de uma vez
console.log("Carregando centróides…");
const centroidesPorId = new Map(); // city_id → { lat, lon }
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .rpc("city_centroids_for_cnpj")
    .range(from, from + 999);
  if (error) throw error;
  for (const r of data) centroidesPorId.set(r.city_id, { lat: r.lat, lon: r.lon });
  if (data.length < 1000) break;
}
console.log(`${centroidesPorId.size} centróides carregados.`);

// Descobre o release mais novo da RF
const release = await releaseRF();
console.log(`Release RF: ${release}`);

// Baixa e parseia o arquivo de municípios RF (código RF → nome)
const tmpMunic = `/tmp/rfb-municipios-${release}.zip`;
if (!existsSync(tmpMunic)) await baixar(`${BASE_RF}${release}/Municipios.zip`, tmpMunic);
const rfParaNome = new Map(); // rf_code (string) → nome normalizado
const rfParaUF = new Map();  // rf_code → UF (não existe no arquivo Municipios — inferimos dos Estabelecimentos)
console.log("Parseando Municipios.zip…");
for await (const linha of linhasDoZip(tmpMunic)) {
  const [codigo, nome] = linha.split(";").map((s) => s.replace(/"/g, "").trim());
  if (codigo && nome) rfParaNome.set(codigo, norm(nome));
}
console.log(`${rfParaNome.size} municípios na referência da RF.`);

// candidatos[city_id] = array de { nome, categoria, endereco }
const candidatos = new Map();

// Processa cada arquivo Estabelecimentos
for (const parte of partes) {
  const arquivo = `Estabelecimentos${parte}.zip`;
  const tmpPath = `/tmp/rfb-${release}-${arquivo}`;
  if (!existsSync(tmpPath)) {
    await baixar(`${BASE_RF}${release}/${arquivo}`, tmpPath);
  } else {
    console.log(`  ${arquivo} já baixado.`);
  }

  console.log(`  Parseando ${arquivo}…`);
  let linhas = 0;
  let matches = 0;

  for await (const linha of linhasDoZip(tmpPath)) {
    linhas++;
    if (linhas % 500000 === 0) process.stdout.write(`\r    ${(linhas / 1e6).toFixed(1)}M linhas, ${matches} candidatos   `);

    const f = parseLinha(linha);
    if (f.length < 21) continue;

    // f[5]: situação cadastral (02 = ativa)
    if (f[5] !== "02") continue;

    // f[11]: CNAE principal
    const cnae = Number(f[11]);
    const cat = CNAES[cnae];
    if (!cat) continue;

    // f[4]: nome fantasia
    const nomeFantasia = f[4].trim();
    if (nomeFantasia.length < 2) continue;

    // f[19]: UF, f[20]: código RF do município
    const uf = f[19].trim();
    if (ufFiltro && uf !== ufFiltro) continue;

    const rfCode = f[20].trim();
    const nomeNorm = rfParaNome.get(rfCode);
    if (!nomeNorm) continue;

    const chave = `${nomeNorm}|${uf}`;
    const cidade = cidadesPorNormUF.get(chave);
    if (!cidade) continue;

    // f[13]: tipo logradouro, f[14]: logradouro, f[15]: número, f[17]: bairro
    const tipo = f[13].trim();
    const logra = f[14].trim();
    const num = f[15].trim();
    const bairro = f[17].trim();
    const parteEndereco = [tipo, logra, num && num !== "S/N" ? num : ""].filter(Boolean).join(" ");
    const endereco = [parteEndereco, bairro].filter(Boolean).join(", ").slice(0, 200) || null;

    const lista = candidatos.get(cidade.id) ?? [];
    if (lista.length < limite) {
      lista.push({ nome: nomeFantasia.slice(0, 80), categoria: cat, endereco });
      candidatos.set(cidade.id, lista);
    }
    matches++;
  }
  process.stdout.write(`\r    ${(linhas / 1e6).toFixed(1)}M linhas, ${matches} candidatos   \n`);
}

console.log(`\nTotal: ${candidatos.size} municípios com candidatos, ${[...candidatos.values()].reduce((s, v) => s + v.length, 0)} lugares.`);

if (simular) {
  for (const [cityId, lista] of candidatos) {
    const c = cidadesPorId.get(cityId);
    console.log(`  ${c.name}/${c.state} (${c.ibge_code}): ${lista.map((l) => `${l.nome} [${l.categoria}]`).join(", ")}`);
  }
  process.exit(0);
}

// Insere no banco
let totalInseridos = 0;
let totalCidades = 0;

for (const [cityId, lista] of candidatos) {
  const cidade = cidadesPorId.get(cityId);
  const centro = centroidesPorId.get(cityId);
  if (!centro) {
    console.log(`  ${cidade.name}/${cidade.state}: sem centróide, pulando.`);
    continue;
  }
  const { lat, lon } = centro;

  const inseridos = [];
  const motivos = new Map();

  for (const c of lista) {
    // Pequeno jitter (~200 m) para não empilhar todos no mesmo ponto
    const dLat = (Math.random() - 0.5) * 0.004;
    const dLon = (Math.random() - 0.5) * 0.004;
    const row = {
      name: c.nome,
      category: c.categoria,
      address: c.endereco,
      location: `SRID=4326;POINT(${lon + dLon} ${lat + dLat})`,
      verified: false,
      prominence: 0,
    };
    const { error } = await supabase.from("places").insert(row);
    if (error) {
      const m = error.code === "P0004" ? "duplicata próxima" : error.message.replace(/".*?"/g, "…").slice(0, 80);
      motivos.set(m, (motivos.get(m) ?? 0) + 1);
    } else {
      inseridos.push(c);
    }
  }

  totalInseridos += inseridos.length;
  totalCidades++;
  process.stdout.write(`\r  ${totalCidades}/${candidatos.size} municípios, ${totalInseridos} lugares inseridos   `);

  if (motivos.size) {
    process.stdout.write("\n");
    for (const [m, n] of motivos) console.log(`    ${n}× recusado: ${m}`);
  }
}

process.stdout.write("\n");
console.log(`\nPronto: ${totalInseridos} lugares inseridos em ${totalCidades} municípios.`);
