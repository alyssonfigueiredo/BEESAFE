// Casa cada lugar com o cadastro do Google Places e guarda a referência da foto principal.
// Roda na SUA máquina, nunca no app:
//   set -a && source .env.scripts && set +a
//   node scripts/google-place-photos.mjs 2611606 2507507  # cidades (IBGE), nesta ordem
//   node scripts/google-place-photos.mjs --todas          # todas as cidades com lugares
//   node scripts/google-place-photos.mjs --todas --listar # só mostra os 150 que entrariam hoje
// Ordem da fila: avaliados primeiro, depois prominence (migration 17), revezando as cidades.
//
// .env.scripts precisa de SUPABASE_SERVICE_ROLE_KEY e GOOGLE_MAPS_API_KEY (chave com a
// Places API (New) habilitada e a cota travada no gratuito — ver docs/fotos.md).
//
// Regras do Google que este script segue: o place_id fica para sempre; nome da foto e autor
// valem 30 dias, então são renovados a partir do 25º. A imagem nunca é baixada.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const google = process.env.GOOGLE_MAPS_API_KEY;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (em .env.scripts)");
if (!google) throw new Error("Defina GOOGLE_MAPS_API_KEY (em .env.scripts)");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const todas = args.includes("--todas");
// --listar [N]: mostra os próximos N da fila (padrão 150, a cota do dia) sem chamar o Google.
const iListar = args.indexOf("--listar");
const listar = iListar >= 0 ? Number(args[iListar + 1]) || 150 : 0;
// A ordem importa: a cota do dia acaba no meio, então quem vem primeiro é quem entra.
const ibges = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!todas && !ibges.length) ibges.push(4106902);

// Um lugar do Google só é aceito se estiver a até este raio do nosso ponto: fora disso é
// homônimo em outro bairro, e a foto errada é pior que nenhuma.
const RAIO_M = 250;
const RENOVAR_APOS_DIAS = 25;
const PAUSA_MS = 120;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

function distanciaM(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const normaliza = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

// Alguma palavra do nosso nome tem que aparecer no nome do Google (além da distância).
function nomeBate(nosso, deles) {
  const a = normaliza(nosso);
  const b = new Set(normaliza(deles));
  return a.length === 0 || a.some((w) => b.has(w));
}

async function chamada(caminho, { method = "GET", body, fieldMask }) {
  const r = await fetch(`https://places.googleapis.com/v1/${caminho}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": google,
      "X-Goog-FieldMask": fieldMask,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (r.status === 429) throw new Error("COTA: o Google devolveu 429 — a trava de cota segurou. Tenta amanhã.");
  if (!r.ok) throw new Error(`Google ${r.status}: ${json.error?.message ?? "sem detalhe"}`);
  return json;
}

function fotoDe(place) {
  const f = place?.photos?.[0];
  if (!f?.name) return null;
  const autor = f.authorAttributions?.[0];
  return { name: f.name, author: autor?.displayName ?? null, uri: autor?.uri ?? null };
}

async function buscar(lugar) {
  const texto = [lugar.name, lugar.address, lugar.city].filter(Boolean).join(", ");
  const json = await chamada("places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.displayName,places.location,places.photos",
    body: {
      textQuery: texto,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 3,
      locationBias: {
        circle: { center: { latitude: lugar.latitude, longitude: lugar.longitude }, radius: RAIO_M * 2 },
      },
    },
  });
  for (const p of json.places ?? []) {
    const d = distanciaM(
      { lat: lugar.latitude, lng: lugar.longitude },
      { lat: p.location?.latitude ?? 0, lng: p.location?.longitude ?? 0 },
    );
    if (d <= RAIO_M && nomeBate(lugar.name, p.displayName?.text ?? "")) return p;
  }
  return null;
}

async function detalhes(placeId) {
  return chamada(`places/${placeId}`, { fieldMask: "id,photos" });
}

// Fila de uma cidade, já ordenada: avaliados primeiro, depois os mais confirmados pelas fontes
// (prominence, migration 17). Quem foi tentado há menos de 25 dias fica de fora.
async function filaDaCidade(cidade) {
  const lugares = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("public_places")
      .select("id, name, address, city, latitude, longitude, rating_count")
      .eq("city_id", cidade.id)
      .range(de, de + 999);
    if (error) throw error;
    lugares.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const internos = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("places")
      .select("id, google_place_id, google_photo_at, prominence")
      .eq("city_id", cidade.id)
      .range(de, de + 999);
    if (error) throw error;
    internos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const estado = new Map(internos.map((p) => [p.id, p]));
  const limite = new Date(Date.now() - RENOVAR_APOS_DIAS * 86400000);
  const pendentes = lugares
    .map((l) => ({ ...l, cidade, atual: estado.get(l.id) ?? {} }))
    .filter((l) => !(l.atual.google_photo_at && new Date(l.atual.google_photo_at) > limite));
  pendentes.sort(
    (x, y) => (y.rating_count ?? 0) - (x.rating_count ?? 0) || (y.atual.prominence ?? 0) - (x.atual.prominence ?? 0),
  );
  return { pendentes, pulados: lugares.length - pendentes.length };
}

// Revezamento entre cidades: o 1º de cada uma, depois o 2º de cada uma… Assim a cota do dia
// (150) rende os melhores de todas em vez de esgotar a primeira da lista.
function revezar(filas) {
  const saida = [];
  for (let i = 0; filas.some((f) => f[i]); i++) for (const f of filas) if (f[i]) saida.push(f[i]);
  return saida;
}

async function processar(lugar, contagem) {
  const { atual } = lugar;
  try {
    let place;
    if (!atual.google_place_id) {
      place = await buscar(lugar);
      if (!place) {
        contagem.naoAchou++;
        // Marca a tentativa para não gastar cota de novo com o mesmo lugar amanhã.
        await supabase.from("places").update({ google_photo_at: new Date().toISOString() }).eq("id", lugar.id);
        await pausa(PAUSA_MS);
        return;
      }
      contagem.casados++;
    } else {
      place = await detalhes(atual.google_place_id);
      contagem.renovados++;
    }
    const foto = fotoDe(place);
    if (!foto) contagem.semFoto++;
    const { error: erroUpdate } = await supabase
      .from("places")
      .update({
        google_place_id: place.id ?? atual.google_place_id,
        google_photo_name: foto?.name ?? null,
        google_photo_author: foto?.author ?? null,
        google_photo_author_uri: foto?.uri ?? null,
        google_photo_at: new Date().toISOString(),
      })
      .eq("id", lugar.id);
    if (erroUpdate) throw erroUpdate;
  } catch (e) {
    if (String(e.message).startsWith("COTA")) throw e;
    console.log(`  ${lugar.name}: ${e.message}`);
  }
  await pausa(PAUSA_MS);
}

let cidades;
if (todas) {
  const ids = new Set();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from("places").select("city_id").eq("status", "active").range(de, de + 999);
    if (error) throw error;
    for (const p of data ?? []) if (p.city_id) ids.add(p.city_id);
    if (!data || data.length < 1000) break;
  }
  const { data: lista, error: erroCidades } = await supabase.from("cities").select("id, name").in("id", [...ids]);
  if (erroCidades) throw erroCidades;
  cidades = lista.sort((x, y) => x.name.localeCompare(y.name));
} else {
  cidades = [];
  for (const ibge of ibges) {
    const { data, error } = await supabase.from("cities").select("id, name").eq("ibge_code", ibge).single();
    if (error) throw new Error(`Município ${ibge}: ${error.message}`);
    cidades.push(data);
  }
}

const filas = [];
let pulados = 0;
for (const c of cidades) {
  const f = await filaDaCidade(c);
  filas.push(f.pendentes);
  pulados += f.pulados;
}
const fila = revezar(filas);

if (listar) {
  console.log(`Próximos ${Math.min(listar, fila.length)} da fila (${fila.length} pendentes, ${pulados} já tentados):`);
  for (const l of fila.slice(0, listar))
    console.log(`  ${l.cidade.name.padEnd(16)} ${String(l.atual.prominence ?? 0).padStart(3)}  ${l.rating_count ? `★${l.rating_count} ` : ""}${l.name}`);
  process.exit(0);
}

const contagem = { casados: 0, renovados: 0, semFoto: 0, naoAchou: 0 };
try {
  for (const l of fila) await processar(l, contagem);
} catch (e) {
  if (!String(e.message).startsWith("COTA")) throw e;
  console.log("\nCota do dia esgotada — a trava segurou. Roda de novo amanhã; ele continua de onde parou.");
}
console.log(
  `${contagem.casados} casados, ${contagem.renovados} renovados, ${contagem.semFoto} sem foto no Google, ` +
    `${contagem.naoAchou} não encontrados, ${pulados} já tentados`,
);
