// Monta a página de aprovação do Instagram a partir de docs/legendas/fila.json.
//
// Por que existe: o artefato onde o Alysson aprova (CLAUDE.md, seção "Aprovação de posts do
// Instagram") era remontado à mão, e toda peça nova ou texto corrigido deixava a página mentindo —
// ele aprovava olhando uma arte que já não ia ao ar. Aqui a página nasce do repositório, então ela
// não tem como divergir.
//
// Roda:  node scripts/artefato-aprovacao.mjs
// Sai:   build/aprovacao/index.html  (a página)
//        build/aprovacao/t/<id>.jpg  (capa de cada peça, para a grade)
//        build/aprovacao/c/<id>-NN.jpg  (as lâminas, para passar no visor)
//        build/aprovacao/v/<id>.mp4  (os reels)
// Depois: publicar essa pasta no artefato, numa sessão da conta dele (só ela alcança o artefato).
//
// A página grava em `aprovacoes` (doc_id = id da peça, {aprovado, publicar_agora, arquivado, ts})
// e `pedidos` ({texto, resolvido, ts}) — os mesmos nomes de antes, para não perder o que já foi
// decidido. As três decisões moram no MESMO documento, então quem gravar de fora tem que mesclar.
//   publicar_agora: ele quer furar a fila (aprovado + a data puxada pra agora na sincronização).
//   arquivado: a data passou e a peça não foi usada — sai da fila sem ser apagada, pra reaproveitar.

import { Buffer } from "node:buffer";
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const RAIZ = resolve(import.meta.dirname, "..");
const SAIDA = join(RAIZ, "build/aprovacao");
const FILA = JSON.parse(readFileSync(join(RAIZ, "docs/legendas/fila.json"), "utf8"));
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";

mkdirSync(join(SAIDA, "t"), { recursive: true });
mkdirSync(join(SAIDA, "c"), { recursive: true });
mkdirSync(join(SAIDA, "v"), { recursive: true });

// ---------- as artes ----------
// Carrossel e post: as lâminas exportadas. Reels: o MP4, e a capa sai de um quadro dele.
// A arte de uma peça é o que `midias` aponta — nem toda peça tem pasta com o próprio nome
// (os quatro stories de outubro saem de `stories-2/`, por exemplo). O id serve só de atalho.
function laminas(item) {
  const id = typeof item === "string" ? item : item.id;
  const peca = typeof item === "string" ? FILA.find((p) => p.id === id) : item;
  const dir = join(RAIZ, "docs", id);
  if (existsSync(dir)) {
    const png = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
    if (png.length) return png.map((f) => join(dir, f));
  }
  const doFila = (peca?.midias ?? [])
    .map((u) => u.split("/docs/")[1])
    .filter((c) => c && c.endsWith(".png"))
    .map((c) => join(RAIZ, "docs", c))
    .filter(existsSync);
  return doFila;
}

function filme(item) {
  const id = typeof item === "string" ? item : item.id;
  const peca = typeof item === "string" ? FILA.find((p) => p.id === id) : item;
  const porId = join(RAIZ, `docs/Irisa-${id}.mp4`);
  if (existsSync(porId)) return porId;
  const daFila = (peca?.midias ?? [])
    .map((u) => u.split("/docs/")[1])
    .filter((c) => c && c.endsWith(".mp4"))
    .map((c) => join(RAIZ, "docs", c))
    .find(existsSync);
  return daFila ?? null;
}

const semArte = new Set();

async function artes(pg) {
  for (const item of FILA) {
    const { id } = item;
    const mp4 = filme(item);
    const fs = laminas(item);

    if (fs.length) {
      for (const [i, src] of fs.entries()) {
        await reduzir(pg, src, join(SAIDA, "c", `${id}-${String(i + 1).padStart(2, "0")}.jpg`), 720);
      }
      await reduzir(pg, fs[0], join(SAIDA, "t", `${id}.jpg`), 420);
      continue;
    }

    if (mp4) {
      copyFileSync(mp4, join(SAIDA, "v", `${id}.mp4`));
      execFileSync(FFMPEG, ["-y","-ss","1.5","-i",mp4,"-frames:v","1","-vf","scale=420:-1",
                            join(SAIDA, "t", `${id}.jpg`), "-loglevel","error"]);
      continue;
    }

    semArte.add(id);
    console.log(`  sem arte no repositório: ${id} (o cartão aparece sem miniatura)`);
  }
}

// Chromium só para redimensionar: evita depender de outra biblioteca de imagem.
async function reduzir(pg, src, destino, largura) {
  const b64 = readFileSync(src).toString("base64");
  const jpg = await pg.evaluate(async ([dados, w]) => {
    const img = new Image();
    img.src = "data:image/png;base64," + dados;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w; c.height = Math.round((img.height * w) / img.width);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82).split(",")[1];
  }, [b64, largura]);
  writeFileSync(destino, Buffer.from(jpg, "base64"));
}

// ---------- a página ----------
// Layout fixo (pedido do Alysson, 01/10/2026): mockup de perfil do Instagram com abas
// Perfil/Lista/Calendário. Só o CONTEÚDO nasce do fila.json a cada rodada — o visual em si
// não muda sozinho; só muda se ele pedir. Template em scripts/aprovacao-template.html.
function construirDados() {
  const FEED = [], STORIES = [];
  for (const item of FILA) {
    const fs = laminas(item);
    const mp4 = filme(item);
    const comArte = !semArte.has(item.id);
    const base = {
      id: item.id,
      quando: item.quando,
      legenda: item.legenda || "",
      fixado: item.primeiro_comentario || "",
      nota: item.nota || "",
      publicado: !!item.publicado,
      // estado inicial: o banco do artefato manda, mas se ele ainda não tem documento
      // dessa peça vale o que está no fila.json (eu transcrevo as decisões pra lá).
      aprovado: !!item.aprovado,
      publicar_agora: !!item.publicar_agora,
      arquivado: !!item.arquivado,
    };
    if (item.tipo === "STORY") {
      STORIES.push({ ...base, tipo: "STORY", arquivo: comArte ? `c/${item.id}-01.jpg` : "" });
      continue;
    }
    if (item.tipo === "REELS") {
      FEED.push({ ...base, tipo: "REELS", video: mp4 ? `v/${item.id}.mp4` : "" });
      continue;
    }
    FEED.push({ ...base, tipo: "POST",
      arquivos: comArte ? fs.map((_, i) => `c/${item.id}-${String(i + 1).padStart(2, "0")}.jpg`) : [] });
  }
  FEED.sort((a, b) => new Date(a.quando) - new Date(b.quando));
  STORIES.sort((a, b) => new Date(a.quando) - new Date(b.quando));
  return { FEED, STORIES };
}

function pagina() {
  const { FEED, STORIES } = construirDados();
  let html = readFileSync(join(import.meta.dirname, "aprovacao-template.html"), "utf8");
  html = html.replace("__FEED_JSON__", JSON.stringify(FEED));
  html = html.replace("__STORIES_JSON__", JSON.stringify(STORIES));
  return html;
}

const navegador = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--ignore-certificate-errors"],
});
const pg = await navegador.newPage();
await pg.goto("about:blank");
console.log(`${FILA.length} peças na fila. Preparando as artes…`);
await artes(pg);
await navegador.close();

writeFileSync(join(SAIDA, "index.html"), pagina());
console.log(`\nPronto em build/aprovacao/`);
console.log(`  index.html  ·  ${readdirSync(join(SAIDA,"t")).length} capas  ·  ${readdirSync(join(SAIDA,"c")).length} lâminas  ·  ${readdirSync(join(SAIDA,"v")).length} reels`);
console.log(`\nAgora publique essa pasta no artefato da aprovação (só a sessão da conta dele alcança).`);
