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
// A página grava em `aprovacoes` (doc_id = id da peça, {aprovado, ts, quem}) e `pedidos`
// ({texto, resolvido, ts}) — os mesmos nomes de antes, para não perder o que já foi decidido.

import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const RAIZ = resolve(import.meta.dirname, "..");
const SAIDA = join(RAIZ, "build/aprovacao");
const FILA = JSON.parse(readFileSync(join(RAIZ, "docs/legendas/fila.json"), "utf8"));
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
// Capas de noite: o xadrez da grade (skill irisa-posts, seção 6a). A página mostra de que lado cai.
const NOITE = new Set(["carrossel-4","carrossel-5","carrossel-6","carrossel-7","carrossel-8",
                       "carrossel-9","carrossel-10","carrossel-11"]);
const DIAS = ["segunda","terça","quarta","quinta","sexta","sábado","domingo"];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

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
function dados() {
  return FILA.map((item) => {
    const q = new Date(item.quando);
    const n = laminas(item).length;
    return {
      id: item.id,
      dia: `${DIAS[(q.getDay() + 6) % 7]} ${String(q.getDate()).padStart(2,"0")}/${String(q.getMonth()+1).padStart(2,"0")}`,
      hora: q.getMinutes() ? `${q.getHours()}h${String(q.getMinutes()).padStart(2,"0")}` : `${q.getHours()}h`,
      tipo: item.tipo,
      capa: NOITE.has(item.id) ? "noite" : "papel",
      n: Math.max(n, 1),
      video: !n && !!filme(item),
      semArte: semArte.has(item.id),
      leg: item.legenda || "",
      com: item.primeiro_comentario || "",
      publicado: !!item.publicado,
      manual: item.publicado_manual || "",
      naFila: !!item.aprovado,
    };
  });
}

function pagina() {
const PECAS = dados();
return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Aprovar a fila da Irisa</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>
:root{--papel:#F5F4F1;--pano:#FFF;--linha:#E3E0D9;--tinta:#141829;--meio:#4A5169;--fraco:#878CA0;
 --coral:#C72825;--turq:#0A8B7A;--ambar:#9C6C00;--lilas:#6037F0;
 --arco:linear-gradient(90deg,#FF6964,#FFA353,#FFD066,#49DCC0,#59A7FF,#A889FF);
 --display:"Oswald","Arial Narrow",sans-serif;--corpo:"Space Grotesk","Helvetica Neue",Arial,sans-serif;
 color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
 --papel:#101320;--pano:#191D2E;--linha:#2A3045;--tinta:#F2F1EE;--meio:#A7ADC2;--fraco:#767C93;
 --coral:#FF8A86;--turq:#49DCC0;--ambar:#FFC861;--lilas:#C3ABFF;color-scheme:dark}}
:root[data-theme="dark"]{--papel:#101320;--pano:#191D2E;--linha:#2A3045;--tinta:#F2F1EE;--meio:#A7ADC2;
 --fraco:#767C93;--coral:#FF8A86;--turq:#49DCC0;--ambar:#FFC861;--lilas:#C3ABFF;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--tinta);font-family:var(--corpo);font-size:15px;line-height:1.5;
 padding:30px 16px 70px}
main{max-width:860px;margin:0 auto}
.rb{height:6px;border-radius:3px;background:var(--arco);margin-bottom:20px}
h1{font-family:var(--display);text-transform:uppercase;font-weight:700;font-size:clamp(28px,6vw,42px);
 line-height:1.14;letter-spacing:.01em;margin:0 0 8px}
.sub{color:var(--meio);margin:0 0 6px;max-width:60ch}
.placar{font:500 13px/1.5 var(--corpo);color:var(--fraco);margin:0 0 20px}
.placar b{color:var(--tinta)}
.grade{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.cel{position:relative;padding:0;border:0;background:var(--pano);cursor:pointer;aspect-ratio:4/5;overflow:hidden;display:block}
.cel img{width:100%;height:100%;object-fit:cover;display:block}
.cel:focus-visible{outline:3px solid var(--turq);outline-offset:2px}
.cel .dia{position:absolute;left:0;bottom:0;background:rgba(20,24,41,.74);color:#fff;
 font:600 10px/1 var(--corpo);letter-spacing:.04em;padding:5px 7px}
.cel .marca{position:absolute;right:6px;top:6px;background:rgba(20,24,41,.74);color:#fff;
 font:700 10px/1 var(--corpo);letter-spacing:.06em;padding:5px 7px;border-radius:5px}
.cel .selo{position:absolute;left:0;top:0;right:0;height:5px}
.cel[data-s="ok"] .selo{background:#2FBF7E}
.cel[data-s="ajuste"] .selo{background:#E0873F}
.cel[data-pub] img{opacity:.42}
dialog{border:0;padding:0;background:transparent;width:100%;height:100%;max-width:100vw;max-height:100vh;color:#F2F1EE}
dialog::backdrop{background:rgba(10,12,20,.94)}
.visor{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
 padding:calc(14px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px))}
.palco{position:relative;display:flex;align-items:center;justify-content:center;width:100%;max-width:min(400px,90vw);min-height:0}
.palco img,.palco video{width:100%;max-height:calc(100vh - 300px);object-fit:contain;display:block;border-radius:4px;background:#000}
.seta{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:0;
 background:rgba(242,241,238,.92);color:#141829;font-size:21px;cursor:pointer;display:grid;place-items:center}
.seta[disabled]{opacity:.26;cursor:default}
.seta.e{left:-6px}.seta.d{right:-6px}
@media (max-width:520px){.seta.e{left:4px}.seta.d{right:4px}}
.pontos{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;min-height:6px}
.pontos b{width:6px;height:6px;border-radius:50%;background:rgba(242,241,238,.32)}
.pontos b.on{background:#F2F1EE}
.ficha{text-align:center;max-width:min(430px,92vw)}
.ficha .meta{font:600 11px/1.4 var(--corpo);letter-spacing:.1em;text-transform:uppercase;color:#9AA0B4}
.ficha .tit{font-family:var(--display);text-transform:uppercase;font-size:20px;letter-spacing:.02em;margin:4px 0 0}
.leg{width:100%;max-width:min(430px,92vw);border:1px solid rgba(242,241,238,.2);border-radius:12px;
 padding:10px 13px;background:rgba(242,241,238,.05)}
.leg summary{cursor:pointer;font:600 11px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase;color:#9AA0B4;list-style:none}
.leg summary::-webkit-details-marker{display:none}
.leg summary::before{content:"+ ";color:#49DCC0}
.leg[open] summary::before{content:"– "}
.leg p{white-space:pre-wrap;font-size:14px;margin:10px 0 0;color:#DCE0E8}
.leg .com{margin-top:8px;color:#9AA0B4;font-size:12.5px}
.acoes{display:flex;gap:8px;width:100%;max-width:min(430px,92vw)}
.acoes button{flex:1;font:700 13px/1 var(--corpo);border:1px solid rgba(242,241,238,.3);background:none;
 color:#F2F1EE;border-radius:999px;padding:12px 16px;cursor:pointer}
.acoes button[aria-pressed="true"][data-v="ok"]{background:#2FBF7E;border-color:#2FBF7E;color:#04150D}
.acoes button[aria-pressed="true"][data-v="ajuste"]{background:#E0873F;border-color:#E0873F;color:#1C1209}
.acoes button[disabled]{opacity:.34;cursor:default}
.nota{width:100%;max-width:min(430px,92vw)}
.nota textarea{width:100%;min-height:54px;resize:vertical;border-radius:12px;padding:10px 13px;
 border:1px solid rgba(242,241,238,.2);background:rgba(242,241,238,.06);color:#F2F1EE;font:14px/1.45 var(--corpo)}
.estado{font:500 11px/1.4 var(--corpo);color:#9AA0B4;min-height:14px}
.passo{display:flex;gap:8px}
.passo button{font:500 12px/1 var(--corpo);border:1px solid rgba(242,241,238,.3);background:none;color:#F2F1EE;
 border-radius:999px;padding:9px 15px;cursor:pointer}
.passo button[disabled]{opacity:.3;cursor:default}
.fechar{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:14px;width:38px;height:38px;
 border-radius:50%;border:0;background:rgba(242,241,238,.92);color:#141829;font-size:19px;cursor:pointer}
.aviso{border-left:4px solid var(--coral);background:var(--pano);border-radius:0 12px 12px 0;
 padding:14px 16px;margin:0 0 18px;color:var(--meio);font-size:14px}
footer{margin-top:28px;color:var(--fraco);font-size:12.5px}
</style></head><body>
<main>
<div class="rb"></div>
<h1>Aprovar a fila</h1>
<p class="sub">Toque numa peça para ver a arte inteira e a legenda. Aprovar e pedir ajuste ficam gravados aqui.</p>
<p class="placar" id="placar">carregando…</p>
<p class="aviso" id="semBanco" hidden>As decisões não estão sendo gravadas nesta sessão: dá para ver tudo, mas aprovar só funciona para quem abre o link com a conta certa.</p>
<div class="grade" id="grade"></div>
<footer>Gerado de <code>docs/legendas/fila.json</code> por <code>scripts/artefato-aprovacao.mjs</code>. Nada publica sozinho: o robô só leva ao ar o que estiver aprovado no repositório.</footer>
</main>
<dialog id="visor">
  <button class="fechar" type="button" data-fechar aria-label="Fechar">&#10005;</button>
  <div class="visor">
    <div class="palco">
      <button class="seta e" type="button" data-card="-1" aria-label="Anterior">&#8249;</button>
      <img id="arte" alt=""><video id="filme" playsinline controls preload="metadata" hidden></video>
      <button class="seta d" type="button" data-card="1" aria-label="Próxima">&#8250;</button>
    </div>
    <div class="pontos" id="pontos"></div>
    <div class="ficha"><span class="meta" id="meta"></span><p class="tit" id="tit"></p></div>
    <details class="leg"><summary>legenda</summary><p id="legTxt"></p><p class="com" id="legCom"></p></details>
    <div class="acoes">
      <button type="button" data-v="ok" id="bOk" aria-pressed="false">Aprovar</button>
      <button type="button" data-v="ajuste" id="bAj" aria-pressed="false">Pedir ajuste</button>
    </div>
    <div class="nota"><textarea id="nota" placeholder="o que mudar, se for o caso"></textarea></div>
    <p class="estado" id="estado"></p>
    <div class="passo">
      <button type="button" data-post="-1" id="pAnt">anterior</button>
      <button type="button" data-post="1" id="pProx">próxima</button>
    </div>
  </div>
</dialog>
<script>
const PECAS = ${JSON.stringify(PECAS)};
const nn = (n) => String(n).padStart(2, "0");
const grade = document.getElementById("grade");
const decisoes = {};
let db = null, eu = null, atual = 0, card = 0;

for (const [i, p] of PECAS.entries()) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "cel"; b.dataset.i = i; b.id = "cel" + i;
  if (p.publicado) b.dataset.pub = "1";
  b.innerHTML = '<span class="selo"></span>'
    + (p.semArte ? "" : \`<img src="t/\${p.id}.jpg" alt="\${p.id}" loading="lazy">\`)
    + (p.video ? '<span class="marca">REELS</span>' : (p.n > 1 ? \`<span class="marca">\${p.n}</span>\` : ""))
    + \`<span class="dia">\${p.dia}\${p.publicado ? " · no ar" : ""}</span>\`;
  grade.appendChild(b);
}

const visor = document.getElementById("visor");
const arte = document.getElementById("arte"), filme = document.getElementById("filme");
const nota = document.getElementById("nota");
const bOk = document.getElementById("bOk"), bAj = document.getElementById("bAj");
const estado = document.getElementById("estado");

function placar() {
  let ok = 0, aj = 0, pub = 0;
  for (const p of PECAS) {
    if (p.publicado) { pub++; continue; }
    const d = decisoes[p.id]?.status ?? (p.naFila ? "ok" : null);
    if (d === "ok") ok++; else if (d === "ajuste") aj++;
  }
  document.getElementById("placar").innerHTML =
    \`<b>\${ok}</b> aprovadas · <b>\${aj}</b> com ajuste · <b>\${PECAS.length - pub - ok - aj}</b> esperando · <b>\${pub}</b> já no ar\`;
  PECAS.forEach((p, i) => {
    const c = document.getElementById("cel" + i);
    const s = decisoes[p.id]?.status ?? (p.naFila ? "ok" : null);
    if (s) c.dataset.s = s; else delete c.dataset.s;
  });
}

function pintar() {
  const p = PECAS[atual], d = decisoes[p.id] || {};
  if (p.video) {
    filme.hidden = false; arte.hidden = true;
    if (!filme.src.endsWith(\`v/\${p.id}.mp4\`)) filme.src = \`v/\${p.id}.mp4\`;
  } else {
    filme.pause(); filme.hidden = true; arte.hidden = false;
    arte.src = \`c/\${p.id}-\${nn(card + 1)}.jpg\`;
    arte.alt = \`\${p.id}, lâmina \${card + 1} de \${p.n}\`;
  }
  document.getElementById("meta").textContent = \`\${p.dia} · \${p.hora} · \${p.tipo} · capa \${p.capa}\`;
  document.getElementById("tit").textContent = p.id;
  document.getElementById("legTxt").textContent = p.leg || "sem legenda";
  document.getElementById("legCom").textContent = p.com ? "Primeiro comentário: " + p.com : "";
  document.getElementById("pontos").innerHTML = (!p.video && p.n > 1)
    ? Array.from({ length: p.n }, (_, k) => \`<b class="\${k === card ? "on" : ""}"></b>\`).join("") : "";
  visor.querySelector(".seta.e").disabled = p.video || card === 0;
  visor.querySelector(".seta.d").disabled = p.video || card === p.n - 1;
  document.getElementById("pAnt").disabled = atual === 0;
  document.getElementById("pProx").disabled = atual === PECAS.length - 1;
  const s = d.status ?? (p.naFila ? "ok" : null);
  bOk.setAttribute("aria-pressed", String(s === "ok"));
  bAj.setAttribute("aria-pressed", String(s === "ajuste"));
  nota.value = d.nota || "";
  bOk.disabled = bAj.disabled = nota.disabled = !db || p.publicado;
  estado.textContent = p.publicado ? "já publicada"
    : (d.ts ? "decidido " + new Date(d.ts).toLocaleString("pt-BR") : "");
}

function abrir(i) { atual = i; card = 0; pintar(); if (!visor.open) visor.showModal(); }
function andar(passo) {
  const p = PECAS[atual];
  if (!p.video && card + passo >= 0 && card + passo < p.n) { card += passo; pintar(); }
  else if (passo > 0 && atual < PECAS.length - 1) abrir(atual + 1);
  else if (passo < 0 && atual > 0) { atual -= 1; card = PECAS[atual].video ? 0 : PECAS[atual].n - 1; pintar(); }
}

async function gravar(status) {
  if (!db) return;
  const p = PECAS[atual];
  const doc = { aprovado: status === "ok", status, nota: nota.value.trim(),
                ts: new Date().toISOString(), quem: eu || null };
  decisoes[p.id] = doc; pintar(); placar();
  estado.textContent = "gravando…";
  try {
    await db.collection("aprovacoes").doc(p.id).set(doc);
    if (status === "ajuste" && doc.nota) {
      await db.collection("pedidos").doc(p.id).set({ texto: doc.nota, resolvido: false, ts: doc.ts });
    }
    estado.textContent = "gravado";
  } catch (err) {
    estado.textContent = "não deu para gravar: " + (err?.code || "erro");
  }
}

grade.addEventListener("click", (e) => { const c = e.target.closest(".cel"); if (c) abrir(+c.dataset.i); });
visor.addEventListener("click", (e) => {
  const bc = e.target.closest("[data-card]"); if (bc) return andar(+bc.dataset.card);
  const bp = e.target.closest("[data-post]");
  if (bp) return abrir(Math.min(PECAS.length - 1, Math.max(0, atual + +bp.dataset.post)));
  const ba = e.target.closest("[data-v]"); if (ba) return gravar(ba.dataset.v);
  if (e.target.closest("[data-fechar]") || e.target === visor) { filme.pause(); visor.close(); }
});
nota.addEventListener("blur", () => {
  const d = decisoes[PECAS[atual].id];
  if (db && d?.status && (d.nota || "") !== nota.value.trim()) gravar(d.status);
});
document.addEventListener("keydown", (e) => {
  if (!visor.open || e.target === nota) return;
  if (e.key === "ArrowRight") { e.preventDefault(); andar(1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); andar(-1); }
});
let x0 = null;
visor.addEventListener("touchstart", (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
visor.addEventListener("touchend", (e) => {
  if (x0 === null || e.target.closest("video,textarea")) { x0 = null; return; }
  const dx = e.changedTouches[0].clientX - x0; x0 = null;
  if (Math.abs(dx) > 42) andar(dx < 0 ? 1 : -1);
}, { passive: true });

placar();
(async () => {
  db = (await window.claude?.use?.("db")) ?? null;
  const user = (await window.claude?.use?.("user")) ?? null;
  eu = user ? await user.id() : null;
  if (!db) { document.getElementById("semBanco").hidden = false; return; }
  db.collection("aprovacoes").onSnapshot((snap) => {
    for (const d of snap.docs) decisoes[d.id] = d.data();
    placar(); if (visor.open) pintar();
  });
})();
</script>
</body></html>
`;
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
