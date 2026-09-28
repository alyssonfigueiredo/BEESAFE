// Foto de fachada pelo Mapillary, guardada no nosso bucket (Cloudflare R2). Roda na SUA máquina:
//   set -a && source .env.scripts && set +a
//   node scripts/mapillary-photos.mjs --todas            # todas as cidades com lugares
//   node scripts/mapillary-photos.mjs 4106902            # só Curitiba (IBGE)
//   node scripts/mapillary-photos.mjs --todas --limite 50
//   node scripts/mapillary-photos.mjs --todas --simular  # não baixa nem grava, só conta
//
// Por que existe: a foto do Google não pode ser guardada e gasta cota (150 buscas/dia no projeto
// inteiro), então uma capital leva meses. O Mapillary publica as imagens em CC-BY-SA 4.0 — dá
// para baixar, guardar e mostrar com crédito. A foto vira nossa, não vence e não gasta cota.
//
// .env.scripts precisa de:
//   SUPABASE_SERVICE_ROLE_KEY   chave sb_secret_ do projeto
//   MAPILLARY_TOKEN             token MLY|... (mapillary.com/dashboard/developers, grátis)
//   R2_ACCOUNT_ID               id da conta Cloudflare
//   R2_ACCESS_KEY_ID            token de API do R2 com permissão de escrita
//   R2_SECRET_ACCESS_KEY        idem
//   R2_BUCKET                   nome do bucket (ex.: irisa-fotos)
//   R2_PUBLIC_URL               domínio público do bucket (ex.: https://fotos.irisa.app)
//
// Critério: só entra imagem a até 60 m do nosso ponto e cuja câmera aponta para o lugar
// (tolerância de 55°). Foto de fachada errada é pior que nenhuma — sem candidata boa, o app
// segue mostrando o azulejo da categoria.

import { createHash, createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "https://ntjirpqulrnieeglpiei.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.MAPILLARY_TOKEN;
if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY (em .env.scripts)");
if (!token) throw new Error("Defina MAPILLARY_TOKEN (em .env.scripts)");

const R2 = {
  account: process.env.R2_ACCOUNT_ID,
  keyId: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publico: (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, ""),
};

const args = process.argv.slice(2);
const todas = args.includes("--todas");
const simular = args.includes("--simular");
const iLimite = args.indexOf("--limite");
const limite = iLimite >= 0 ? Number(args[iLimite + 1]) || 0 : 0;
const ibges = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!todas && !ibges.length) ibges.push(4106902);

if (!simular) {
  for (const [nome, valor] of Object.entries(R2)) {
    if (!valor) throw new Error(`Defina R2_${nome.toUpperCase()} (em .env.scripts) — ver docs/fotos.md`);
  }
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// A imagem tem que estar perto o suficiente para ser a fachada, e não a esquina de lá.
const RAIO_M = 60;
// A câmera tem que estar apontada para o lugar: fora disso é a calçada oposta ou o céu.
const ANGULO_MAX = 55;
// Quem já foi procurado sem sucesso só volta à fila depois disso (o acervo cresce devagar).
const TENTAR_DE_NOVO_DIAS = 90;
const PAUSA_MS = 150;

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

/** Rumo em graus (0 = norte) de `de` para `para`: é para onde a câmera deveria estar olhando. */
function rumo(de, para) {
  const f1 = (de.lat * Math.PI) / 180;
  const f2 = (para.lat * Math.PI) / 180;
  const dl = ((para.lng - de.lng) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Diferença entre dois ângulos, sempre de 0 a 180. */
function difAngulo(a, b) {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

/** Caixa em graus ao redor do ponto, para o bbox que a API do Mapillary exige. */
function caixa({ lat, lng }, metros) {
  const dLat = metros / 111320;
  const dLng = metros / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(",");
}

async function buscaImagens(ponto) {
  const campos = "id,computed_geometry,geometry,compass_angle,computed_compass_angle,captured_at,thumb_1024_url,creator";
  const api = new URL("https://graph.mapillary.com/images");
  api.searchParams.set("fields", campos);
  api.searchParams.set("bbox", caixa(ponto, RAIO_M));
  api.searchParams.set("limit", "40");
  const r = await fetch(api, { headers: { Authorization: `OAuth ${token}` } });
  if (r.status === 429) throw new Error("COTA: o Mapillary devolveu 429. Espera alguns minutos.");
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mapillary ${r.status}: ${json.error?.message ?? "sem detalhe"}`);
  return json.data ?? [];
}

/**
 * Melhor candidata: perto, apontada para o lugar e recente. Pontua distância e ângulo juntos
 * porque uma foto colada mas de costas é inútil, e uma bem apontada a 55 m ainda serve.
 */
function escolhe(imagens, ponto) {
  const candidatas = [];
  for (const img of imagens) {
    const g = img.computed_geometry ?? img.geometry;
    const c = g?.coordinates;
    if (!c || !img.thumb_1024_url) continue;
    const pos = { lng: c[0], lat: c[1] };
    const dist = distanciaM(ponto, pos);
    if (dist > RAIO_M) continue;
    const bussola = img.computed_compass_angle ?? img.compass_angle;
    if (bussola == null) continue;
    const desvio = difAngulo(bussola, rumo(pos, ponto));
    if (desvio > ANGULO_MAX) continue;
    // Quanto menor, melhor: distância normalizada + desvio normalizado, com desempate pela data.
    const nota = dist / RAIO_M + desvio / ANGULO_MAX - (img.captured_at ?? 0) / 1e16;
    candidatas.push({ img, dist, desvio, nota });
  }
  candidatas.sort((a, b) => a.nota - b.nota);
  return candidatas[0] ?? null;
}

// ---------------------------------------------------------------------------
// Cloudflare R2 (API S3). Assinatura SigV4 na mão para não trazer o SDK da AWS
// para um projeto Expo — são 30 linhas e só precisa de PUT.
// ---------------------------------------------------------------------------

const sha256 = (dado) => createHash("sha256").update(dado).digest("hex");
const hmac = (chave, dado) => createHmac("sha256", chave).update(dado).digest();

async function enviaAoR2(caminho, corpo, contentType) {
  const host = `${R2.account}.r2.cloudflarestorage.com`;
  const agora = new Date();
  const amzDate = agora.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dia = amzDate.slice(0, 8);
  const payloadHash = sha256(corpo);
  const canonical = [
    "PUT",
    `/${R2.bucket}/${caminho}`,
    "",
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
    "content-type;host;x-amz-content-sha256;x-amz-date",
    payloadHash,
  ].join("\n");
  const escopo = `${dia}/auto/s3/aws4_request`;
  const paraAssinar = ["AWS4-HMAC-SHA256", amzDate, escopo, sha256(canonical)].join("\n");
  const assinatura = hmac(
    hmac(hmac(hmac(hmac(`AWS4${R2.secret}`, dia), "auto"), "s3"), "aws4_request"),
    paraAssinar,
  ).toString("hex");

  const r = await fetch(`https://${host}/${R2.bucket}/${caminho}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${R2.keyId}/${escopo}, ` +
        "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, " +
        `Signature=${assinatura}`,
    },
    body: corpo,
  });
  if (!r.ok) throw new Error(`R2 ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
  return `${R2.publico}/${caminho}`;
}

// ---------------------------------------------------------------------------

async function cidades() {
  if (!todas) {
    const { data, error } = await supabase.from("cities").select("id, name, state, ibge_code").in("ibge_code", ibges);
    if (error) throw error;
    // Respeita a ordem pedida na linha de comando: a primeira cidade é a que roda primeiro.
    return ibges.map((i) => data.find((c) => Number(c.ibge_code) === i)).filter(Boolean);
  }
  const { data, error } = await supabase.from("cities").select("id, name, state").order("name");
  if (error) throw error;
  return data;
}

/**
 * Fila da cidade: quem ainda não tem foto nossa, os mais relevantes primeiro (prominence, a
 * mesma ordem da fila do Google). A coordenada vem da view, que já entrega lat/lng prontos.
 */
async function lugaresSemFoto(cityId) {
  const corte = new Date(Date.now() - TENTAR_DE_NOVO_DIAS * 86400000).toISOString();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, prominence")
    .eq("city_id", cityId)
    .eq("status", "active")
    .is("photo_url", null)
    .or(`photo_tried_at.is.null,photo_tried_at.lt.${corte}`)
    .order("prominence", { ascending: false, nullsFirst: false })
    .limit(limite || 500);
  if (error) throw error;
  if (!data.length) return [];

  const coords = new Map();
  for (let de = 0; de < data.length; de += 200) {
    const ids = data.slice(de, de + 200).map((l) => l.id);
    const { data: pontos, error: erroPontos } = await supabase
      .from("public_places")
      .select("id, latitude, longitude")
      .in("id", ids);
    if (erroPontos) throw erroPontos;
    for (const p of pontos ?? []) coords.set(p.id, { lat: p.latitude, lng: p.longitude });
  }
  return data.map((l) => ({ ...l, ponto: coords.get(l.id) ?? null }));
}

async function main() {
  const lista = await cidades();
  let total = { casados: 0, sem: 0, erro: 0 };

  for (const cidade of lista) {
    const lugares = await lugaresSemFoto(cidade.id);
    if (!lugares.length) continue;
    console.log(`\n${cidade.name}/${cidade.state}: ${lugares.length} sem foto`);
    let casados = 0;
    let sem = 0;

    for (const lugar of lugares) {
      const ponto = lugar.ponto;
      if (!ponto) continue;
      try {
        const imagens = await buscaImagens(ponto);
        const melhor = escolhe(imagens, ponto);
        if (!melhor) {
          sem++;
          if (!simular) {
            await supabase.from("places").update({ photo_tried_at: new Date().toISOString() }).eq("id", lugar.id);
          }
          await pausa(PAUSA_MS);
          continue;
        }
        if (simular) {
          casados++;
          console.log(`  ok ${lugar.name} (${Math.round(melhor.dist)} m, ${Math.round(melhor.desvio)}°)`);
          await pausa(PAUSA_MS);
          continue;
        }

        const img = await fetch(melhor.img.thumb_1024_url);
        if (!img.ok) throw new Error(`thumb ${img.status}`);
        const bytes = Buffer.from(await img.arrayBuffer());
        const publica = await enviaAoR2(`lugares/${lugar.id}.jpg`, bytes, "image/jpeg");

        const autor = melhor.img.creator?.username;
        const { error } = await supabase
          .from("places")
          .update({
            photo_url: publica,
            photo_source: "mapillary",
            // CC-BY-SA 4.0 exige o nome de quem fotografou; o app mostra sobre a imagem.
            photo_credit: autor ? `${autor} · Mapillary (CC BY-SA)` : "Mapillary (CC BY-SA)",
            photo_credit_uri: `https://www.mapillary.com/app/?focus=photo&pKey=${melhor.img.id}`,
            photo_at: new Date().toISOString(),
            photo_tried_at: new Date().toISOString(),
          })
          .eq("id", lugar.id);
        if (error) throw error;
        casados++;
        console.log(`  ✓ ${lugar.name} (${Math.round(melhor.dist)} m, ${Math.round(melhor.desvio)}°)`);
      } catch (e) {
        total.erro++;
        console.log(`  ! ${lugar.name}: ${e.message}`);
        if (String(e.message).startsWith("COTA")) throw e;
      }
      await pausa(PAUSA_MS);
    }

    total.casados += casados;
    total.sem += sem;
    console.log(`  ${casados} com foto · ${sem} sem imagem por perto`);
  }

  console.log(
    `\n${simular ? "[simulação] " : ""}total: ${total.casados} com foto · ` +
      `${total.sem} sem imagem por perto · ${total.erro} erros`,
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
