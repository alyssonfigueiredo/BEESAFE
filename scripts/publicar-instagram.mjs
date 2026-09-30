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

// O erro da Graph API volta com o texto da requisição, e às vezes o próprio
// token (quando um secret é trocado pelo outro, ele vira o "ID" do objeto).
// A mensagem vai para fila.json, que é público: nunca deixar o token passar.
function semSegredo(texto) {
  let t = String(texto);
  if (TOKEN) t = t.split(TOKEN).join("***");
  return t.replace(/EAA[A-Za-z0-9]{20,}/g, "***");
}

function erroDaApi(path, j) {
  const e = j.error;
  const detalhe = [e.code && `código ${e.code}`, e.error_subcode && `subcódigo ${e.error_subcode}`].filter(Boolean).join(", ");
  return new Error(semSegredo(`${path}: ${e.message}${detalhe ? ` (${detalhe})` : ""}`));
}

async function chamar(path, params, method = "GET") {
  const url = new URL(`${API}/${path}`);
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", TOKEN);
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) throw erroDaApi(path, j);
    return j;
  }
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = await fetch(url, { method: "POST", body });
  const j = await r.json();
  if (j.error) throw erroDaApi(path, j);
  return j;
}

async function esperarPronto(containerId, tentativas = 20, intervaloMs = 3000) {
  for (let i = 0; i < tentativas; i++) {
    const { status_code } = await chamar(containerId, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error(`container ${containerId} deu erro no processamento`);
    await new Promise((r) => setTimeout(r, intervaloMs));
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

async function publicarReels(item) {
  const c = await chamar(`${IG}/media`, { video_url: item.midias[0], media_type: "REELS", caption: item.legenda || "" }, "POST");
  await esperarPronto(c.id, 40, 5000); // vídeo demora mais pra processar que imagem
  const pub = await chamar(`${IG}/media_publish`, { creation_id: c.id }, "POST");
  if (item.primeiro_comentario) {
    await chamar(`${pub.id}/comments`, { message: item.primeiro_comentario }, "POST");
  }
  return pub.id;
}

// Confirma de verdade que o media_id existe na conta, em vez de confiar só no retorno de
// media_publish: consulta o objeto na Graph API (o "ok" do log é só o container, não é o post
// visto de fora) e, pra story, também checa se ele está na lista de stories ativos.
async function confirmarPublicado(item) {
  const info = await chamar(item.media_id, { fields: "id,media_type,timestamp,permalink" });
  if (item.tipo === "STORY") {
    const ativos = await chamar(`${IG}/stories`, { fields: "id" });
    const naLista = (ativos.data || []).some((s) => s.id === item.media_id);
    return { ...info, na_lista_de_stories_ativos: naLista };
  }
  return info;
}

async function main() {
  const fila = JSON.parse(readFileSync(FILA, "utf8"));
  const agora = new Date();
  let mudou = false;
  // O que deu errado nesta rodada. Silêncio aqui já custou um post: o script
  // gravava o erro no JSON e terminava com sucesso, então o workflow ficava
  // verde e ninguém ficava sabendo que nada tinha ido ao ar.
  const falhas = [];

  // confirma retroativamente quem já publicou mas nunca foi checado de verdade
  for (const item of fila) {
    if (item.publicado && item.confirmado === undefined) {
      try {
        item.confirmacao = await confirmarPublicado(item);
        item.confirmado = true;
        item.confirmado_em = new Date().toISOString();
        console.log(`confirmado ${item.id}: existe na conta.`);
      } catch (e) {
        item.confirmado = false;
        item.confirmado_erro = semSegredo(e.message);
        console.error(`não confirmei ${item.id}: ${semSegredo(e.message)}`);
      }
      mudou = true;
    }
  }

  for (const item of fila) {
    if (item.publicado) continue;
    if (!item.aprovado) continue; // nunca publica sem "aprovado": true marcado à mão
    if (new Date(item.quando) > agora) continue;
    console.log(`publicando ${item.id} (${item.tipo})...`);
    try {
      const mediaId =
        item.tipo === "STORY" ? await publicarStory(item) : item.tipo === "REELS" ? await publicarReels(item) : await publicarPost(item);
      item.publicado = true;
      item.publicado_em = agora.toISOString();
      item.media_id = mediaId;
      delete item.ultimo_erro;
      mudou = true;
      console.log(`ok ${item.id} -> ${mediaId}`);
      try {
        item.confirmacao = await confirmarPublicado(item);
        item.confirmado = true;
        item.confirmado_em = new Date().toISOString();
        console.log(`confirmado ${item.id}: existe na conta.`);
      } catch (e) {
        item.confirmado = false;
        item.confirmado_erro = semSegredo(e.message);
        console.error(`publicou mas não confirmei ${item.id}: ${semSegredo(e.message)}`);
      }
    } catch (e) {
      console.error(`falhou ${item.id}: ${semSegredo(e.message)}`);
      item.ultimo_erro = semSegredo(e.message);
      item.tentativas = (item.tentativas ?? 0) + 1;
      falhas.push(`${item.id} (${item.tipo}, ${item.quando}): ${semSegredo(e.message)}`);
      mudou = true;
    }
  }

  // Aprovado, hora já passou faz mais de 30 minutos e continua sem publicar:
  // ninguém tentou, ou toda tentativa caiu. Também é motivo de aviso.
  const ATRASO_MS = 30 * 60 * 1000;
  for (const item of fila) {
    if (item.publicado || !item.aprovado) continue;
    const atraso = agora - new Date(item.quando);
    if (atraso > ATRASO_MS && !falhas.some((f) => f.startsWith(`${item.id} `))) {
      falhas.push(`${item.id} (${item.tipo}, ${item.quando}): aprovado e atrasado ${Math.round(atraso / 60000)} min, sem publicar.`);
    }
  }

  if (mudou) writeFileSync(FILA, JSON.stringify(fila, null, 1) + "\n");
  else console.log("nada vencido pra publicar agora.");

  if (falhas.length) {
    writeFileSync("falhas-instagram.txt", falhas.join("\n") + "\n");
    console.error(`\n${falhas.length} publicação(ões) não foram ao ar.`);
    process.exitCode = 1;
  }
}

await main();
