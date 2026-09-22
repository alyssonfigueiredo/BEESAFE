// Gera site/ (GitHub Pages) a partir de docs/privacidade.md e docs/termos.md.
//   node scripts/build-site.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

function md(src) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of src.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^# (.*)/))) { close(); out.push(`<h1>${inline(m[1])}</h1>`); }
    else if ((m = line.match(/^## (.*)/))) { close(); out.push(`<h2>${inline(m[1])}</h2>`); }
    else if ((m = line.match(/^- (.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\d+\. (.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (line === "") close();
    else out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join("\n");
}

const style = `
:root{--paper:#FAF9F6;--surface:#fff;--ink:#1E2340;--muted:#6B7080;--border:#E6E3DC;--coral:#F4736F;--amber:#E0A32E;--turq:#2F8F7E}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{display:flex;align-items:center;gap:10px;padding:18px clamp(16px,6vw,96px);border-bottom:1px solid var(--border)}
header a{color:var(--ink);text-decoration:none;font-weight:600;letter-spacing:.18em;font-size:18px}header a b{color:var(--amber);font-weight:600}
header img{width:28px;height:28px}nav{margin-left:auto;display:flex;gap:18px}nav a{letter-spacing:0;font-weight:500;color:var(--muted);font-size:14px}
main{max-width:760px;margin:0 auto;padding:40px clamp(16px,6vw,96px) 80px}
h1{font-size:2rem;line-height:1.2;margin:0 0 8px}h2{font-size:1.15rem;margin:32px 0 8px}p,li{margin:8px 0}a{color:var(--turq)}
.hero{text-align:center;padding:48px 0 24px}.hero img{width:96px;height:96px;border-radius:24px}.hero p{color:var(--muted);max-width:520px;margin:12px auto}
.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}.btn{padding:12px 20px;border-radius:12px;font-weight:600;text-decoration:none;color:var(--ink);background:var(--coral)}.btn.alt{background:transparent;border:1px solid var(--turq);color:var(--turq)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:36px}.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px}.card b{display:block;margin-bottom:4px}.card span{color:var(--muted);font-size:14px}
footer{color:var(--muted);font-size:13px;text-align:center;padding:24px}
`;

const page = (title, body) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Irisa</title><link rel="icon" href="icon.png"><style>${style}</style></head>
<body><header><img src="icon.png" alt=""><a href="./">IRIS<b>A</b></a>
<nav><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a><a href="excluir-conta.html">Excluir conta</a></nav></header>
<main>${body}</main>
<footer>Irisa · projeto comunitário, sem fins lucrativos · <a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos</a></footer>
</body></html>`;

mkdirSync("site", { recursive: true });
copyFileSync("assets/icon.png", "site/icon.png");
copyFileSync("docs/pitch.html", "site/pitch.html");
copyFileSync("docs/mockup.html", "site/mockup.html");
copyFileSync("docs/Irisa-apresentacao.pdf", "site/Irisa-apresentacao.pdf");
writeFileSync("site/privacidade.html", page("Política de Privacidade", md(readFileSync("docs/privacidade.md", "utf8"))));
writeFileSync("site/termos.html", page("Termos de Uso", md(readFileSync("docs/termos.md", "utf8"))));
writeFileSync("site/excluir-conta.html", page("Excluir sua conta", md(readFileSync("docs/excluir-conta.md", "utf8"))));
writeFileSync("site/seguranca-infantil.html", page("Padrões de segurança infantil", md(readFileSync("docs/seguranca-infantil.md", "utf8"))));
writeFileSync("site/index.html", page("Irisa", `
<div class="hero"><img src="icon.png" alt="Irisa">
<h1>Quanta cor tem aqui?</h1>
<p>Mapa colaborativo de segurança e lugares acolhedores para pessoas LGBTQIA+. Relatos anônimos, áreas que pedem atenção e avaliações de quem frequenta.</p>
<div class="btns"><a class="btn" href="https://www.instagram.com/irisapp">Instagram</a><a class="btn alt" href="mailto:appirisa@gmail.com">appirisa@gmail.com</a><a class="btn alt" href="privacidade.html">Política de privacidade</a></div></div>
<div class="cards">
<div class="card"><b>Relatos anônimos</b><span>Seu nome e e-mail nunca aparecem, nem para moderadores.</span></div>
<div class="card"><b>Mapa de atenção</b><span>Zonas e ranking de bairros, atualizados em tempo real.</span></div>
<div class="card"><b>Lugares acolhedores</b><span>Atendimento, afeto, banheiro e clientela, avaliados pela comunidade.</span></div>
<div class="card"><b>Apoio e emergência</b><span>Mural da comunidade, serviços da sua cidade e 190 / 192 / 100 / 188.</span></div>
</div>
<p style="text-align:center;color:var(--muted);margin-top:36px">Em risco imediato, ligue 190.</p>`));
console.log("site/ gerado");
