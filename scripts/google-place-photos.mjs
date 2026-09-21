// Casa cada lugar com o cadastro do Google Places e guarda a referência da foto principal.
// Roda na SUA máquina, nunca no app:
//   set -a && source .env.scripts && set +a
//   node scripts/google-place-photos.mjs 4106902          # uma cidade (código IBGE)
//   node scripts/google-place-photos.mjs --todas          # todas as cidades com lugares
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
const ibge = Number(args.find((a) => /^\d+$/.test(a))) || (todas ? null : 4106902);

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

async function processarCidade(cidade) {
  const { data: lugares, error } = await supabase
    .from("public_places")
    .select("id, name, address, city, latitude, longitude")
    .eq("city_id", cidade.id);
  if (error) throw error;

  const { data: internos, error: erroInternos } = await supabase
    .from("places")
    .select("id, google_place_id, google_photo_at")
    .eq("city_id", cidade.id);
  if (erroInternos) throw erroInternos;
  const estado = new Map(internos.map((p) => [p.id, p]));

  const limite = new Date(Date.now() - RENOVAR_APOS_DIAS * 86400000);
  const contagem = { casados: 0, renovados: 0, semFoto: 0, naoAchou: 0, pulados: 0 };

  for (const lugar of lugares) {
    const atual = estado.get(lugar.id) ?? {};
    const fotoFresca = atual.google_photo_at && new Date(atual.google_photo_at) > limite;
    if (atual.google_place_id && fotoFresca) {
      contagem.pulados++;
      continue;
    }

    try {
      let place;
      if (!atual.google_place_id) {
        place = await buscar(lugar);
        if (!place) {
          contagem.naoAchou++;
          // Marca a tentativa para não gastar cota de novo com o mesmo lugar amanhã.
          await supabase.from("places").update({ google_photo_at: new Date().toISOString() }).eq("id", lugar.id);
          await pausa(PAUSA_MS);
          continue;
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

  console.log(
    `${cidade.name}: ${contagem.casados} casados, ${contagem.renovados} renovados, ` +
      `${contagem.semFoto} sem foto no Google, ${contagem.naoAchou} não encontrados, ${contagem.pulados} já em dia`,
  );
}

let cidades;
if (todas) {
  const { data, error } = await supabase.from("places").select("city_id").eq("status", "active");
  if (error) throw error;
  const ids = [...new Set(data.map((p) => p.city_id).filter(Boolean))];
  const { data: lista, error: erroCidades } = await supabase.from("cities").select("id, name").in("id", ids);
  if (erroCidades) throw erroCidades;
  cidades = lista;
} else {
  const { data, error } = await supabase.from("cities").select("id, name").eq("ibge_code", ibge).single();
  if (error) throw error;
  cidades = [data];
}

for (const c of cidades) await processarCidade(c);
