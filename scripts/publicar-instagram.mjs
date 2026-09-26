// Publica na Instagram Graph API o que já venceu em docs/legendas/fila.json.
// Roda: node scripts/publicar-instagram.mjs
// Precisa de META_IG_USER_ID e META_ACCESS_TOKEN no ambiente (secrets do GitHub Actions).
// Container -> espera FINISHED -> media_publish -> fixa o primeiro comentário. Marca "publicado"
// e regrava a fila; quem chama (o workflow) faz o commit de volta.
import { readFileSync, writeFileSync } from "node:fs";

const IG = process.env.META_IG_USER_ID;
const TOKEN = process.env.META_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v21.0";
const FILA = "docs/legendas/fila.json";

if (!IG || !TOKEN) throw new Error("faltam META_IG_USER_ID / META_ACCESS_TOKEN no ambiente");

async function chamar(path, params, method = "GET") {
  const url = new URL(`${API}/${path}`);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", TOKEN);
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) throw new Error(`${path}: ${j.error.message}`);
    return j;
  }
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(url, { method: "POST", body });
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
}

async function esperarPronto(containerId) {
  for (let i = 0; i < 20; i++) {
    const { status_code } = await chamar(containerId, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`container ${containerId} deu erro no processamento`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`container ${containerId} não ficou pronto a tempo`);
}

async function publicarPost(item) {
  let creationId;
  if (item.midias.length === 1) {
    const c = await chamar(`${IG}/media`, { image_url: item.midias[0], caption: item.legenda || "" }, "POST");
    await esperarPronto(c.id);
    creationId = c.id;
  } else {
    const filhos = [];
    for (const url of item.midias) {
      const c = await chamar(`${IG}/media`, { image_url: url, is_carousel_item: "true" }, "POST");
      await esperarPronto(c.id);
      filhos.push(c.id);
    }
    const pai = await chamar(`${IG}/media`, { media_type: "CAROUSEL", children: filhos.join(","), caption: item.legenda || "" }, "POST");
    await esperarPronto(pai.id);
    creationId = pai.id;
  }
  const pub = await chamar(`${IG}/media_publish`, { creation_id: creationId }, "POST");
  if (item.primeiro_comentario) {
    await chamar(`${pub.id}/comments`, { message: item.primeiro_comentario }, "POST");
  }
  return pub.id;
}

async function publicarStory(item) {
  const c = await chamar(`${IG}/media`, { image_url: item.midias[0], media_type: "STORIES" }, "POST");
  await esperarPronto(c.id);
  const pub = await chamar(`${IG}/media_publish`, { creation_id: c.id }, "POST");
  return pub.id;
}

async function main() {
  const fila = JSON.parse(readFileSync(FILA, "utf8"));
  const agora = new Date();
  let mudou = false;
  for (const item of fila) {
    if (item.publicado) continue;
    if (!item.aprovado) continue; // nunca publica sem "aprovado": true marcado à mão
    if (new Date(item.quando) > agora) continue;
    console.log(`publicando ${item.id} (${item.tipo})...`);
    try {
      const mediaId = item.tipo === "STORY" ? await publicarStory(item) : await publicarPost(item);
      item.publicado = true;
      item.publicado_em = agora.toISOString();
      item.media_id = mediaId;
      mudou = true;
      console.log(`ok ${item.id} -> ${mediaId}`);
    } catch (e) {
      console.error(`falhou ${item.id}: ${e.message}`);
      item.ultimo_erro = e.message;
      mudou = true;
    }
  }
  if (mudou) writeFileSync(FILA, JSON.stringify(fila, null, 1) + "\n");
  else console.log("nada vencido pra publicar agora.");
}

await main();
