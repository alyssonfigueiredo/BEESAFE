// Painel da Irisa (https://appirisa.com.br/admin/). HTML + JS puro, sem build.
// Tudo passa pelas funções admin_* do banco (migration 39), que conferem o papel de quem chama.
// A chave abaixo é a publishable (pública por natureza, a mesma do app); o build do site a injeta.
// Nunca colocar chave secreta aqui.

const SB_URL = "https://ntjirpqulrnieeglpiei.supabase.co";
const SB_KEY = "__SUPABASE_PUBLISHABLE_KEY__";
const TZ = "America/Sao_Paulo";
const PAGE = 50;

const app = document.getElementById("app");
let sb = null;
const me = { email: "", role: "", id: "" };
let viewSeq = 0;

// ---------------------------------------------------------------- textos fixos
const ROLE = { user: "Pessoa", moderator: "Moderação", admin: "Administração" };
const NIVEIS = ["Cinza", "Coral", "Laranja", "Amarelo", "Turquesa", "Azul", "Arco-íris"];
const MEDALHAS = {
  "deu-o-nome": "Deu o Nome",
  "deu-close": "Deu Close",
  figurinha: "Figurinha Conhecida",
  famosinha: "Famosinha/o/e",
  inaugurou: "Inaugurou",
  "acendeu-a-luz": "Acendeu a Luz",
  "eu-conheco": "Eu Conheço um Lugar",
  "nome-na-lista": "Nome na Lista",
  "mala-pronta": "Mala Pronta",
  "bateu-ponto": "Bateu Ponto",
  "ombro-amigo": "Ombro Amigo",
  "abre-alas": "Abre-Alas",
};
const FAMOSINHA = ["Famosinha", "Famosinho", "Famosinhe"];
const BANHO = { neon: "Neon", holo: "Holográfico", dourado: "Dourado" };
const CATEGORIA = { bar: "Bar", restaurante: "Restaurante", balada: "Balada", cafe: "Café", hotel: "Hotel", servico: "Serviço", praca: "Praça", outro: "Outro" };
const SELO = { bem: "Bem avaliado", acolhedor: "Acolhedor", dividido: "Opiniões divididas", atencao: "Atenção", poucas: "Poucas avaliações" };
const TIPO_RELATO = { verbal: "Agressão verbal", fisica: "Violência física", ameaca: "Ameaça", discriminacao: "Discriminação", vandalismo: "Vandalismo" };
const GRAVIDADE = { baixa: "Baixa", media: "Média", alta: "Alta" };
const CAT_MURAL = { acolhimento: "Acolhimento", dica: "Dica de segurança", pedido_ajuda: "Pedido de ajuda" };
const TIPO_SERVICO = { policia: "Polícia", saude: "Saúde", direitos: "Direitos", acolhimento: "Acolhimento", ong: "ONG", juridico: "Jurídico" };
const ALVO = { occurrence: "Relato", place: "Lugar", rating: "Avaliação", message: "Mensagem do mural", photo: "Foto" };
const PUSH_STATUS = { agendada: "Agendada", enviando: "Enviando", enviada: "Enviada", erro: "Erro", cancelada: "Cancelada" };
const FOTO_REVIEW = { pendente: "Esperando análise", humano: "Precisa de olho humano", recusada: "Recusada", aprovada: "Aprovada" };
const FOTO_ORIGEM = { usuario: "de quem avaliou", mapillary: "Mapillary", google: "Google", equipe: "da equipe" };
const TELAS = [
  ["", "Nenhuma (só abre o app)"],
  ["/", "Início"],
  ["/lugares", "Lugares"],
  ["/mapa", "Mapa"],
  ["/apoio", "Mural de apoio"],
  ["/perfil", "Perfil"],
  ["/conquistas", "Conquistas (medalhas)"],
];
const UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
const GOMOS = ["#ff6964", "#ff8e5a", "#ffa353", "#ffbf5f", "#ffd066", "#bed582", "#74d6a4", "#49dcc0", "#4fcbdc", "#52b4f5", "#59a7ff", "#7d96ff", "#a889ff", "#c681dd", "#ea709b", "#ff636e"];
// Palavras que expõem quem recebe a notificação na tela bloqueada.
const PALAVRAS_SENSIVEIS = /\b(lgbt\w*|gays?|l[ée]sbicas?|trans|travestis?|bissexua\w*|queer|sapat[ãa]o|bichas?|viad\w*|homofobia|transfobia|lgbt\w*fobia|relatos?|viol[êe]ncia|agress\w*|den[úu]ncia)\b/i;

// ---------------------------------------------------------------- utilidades
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR"));
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, um, varios) => `${num(n)} ${Number(n) === 1 ? um : varios}`;

const dtf = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dtfY = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const dfY = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit" });
const df = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const yearOf = (d) => isoDay.format(d).slice(0, 4);
const todaySP = () => isoDay.format(new Date());
const clean = (s) => s.replace(",", "");

function fmtDT(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  return clean(yearOf(d) === yearOf(new Date()) ? dtf.format(d) : dtfY.format(d));
}
function fmtD(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return yearOf(d) === yearOf(new Date()) ? df.format(d) : dfY.format(d);
}
// "2026-10-04" → "04/10"
function fmtDay(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return y === todaySP().slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y.slice(2)}`;
}
const dayNum = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
function relDay(s) {
  if (!s) return "nunca";
  const n = dayNum(todaySP()) - dayNum(s);
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  if (n < 45) return `há ${n} dias`;
  return `em ${fmtDay(s)}`;
}
function rel(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  const s = (Date.now() - d.getTime()) / 1000;
  const fut = s < 0;
  const a = Math.abs(s);
  const fmt = (txt) => (fut ? `em ${txt}` : `há ${txt}`);
  if (a < 60) return fut ? "em instantes" : "agora";
  if (a < 3600) return fmt(`${Math.round(a / 60)} min`);
  if (a < 86400) return fmt(`${Math.round(a / 3600)} h`);
  const days = dayNum(isoDay.format(d)) - dayNum(todaySP());
  if (days === -1) return "ontem";
  if (days === 1) return "amanhã";
  if (Math.abs(days) < 45) return fmt(`${Math.abs(days)} dias`);
  if (Math.abs(days) < 365) return fmt(`${Math.round(Math.abs(days) / 30)} meses`);
  return fmtD(ts);
}
const when = (ts) => (ts ? `<span title="${esc(fmtDT(ts))}">${esc(rel(ts))}</span>` : `<span class="dim">—</span>`);

function ptErr(e) {
  const msg = (e && (e.message || e.error_description)) || String(e || "Erro desconhecido");
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  if (/JWT expired|invalid JWT/i.test(msg)) return "Sua sessão venceu. Saia e entre de novo.";
  if (/Could not find the function/i.test(msg)) return `Essa função ainda não existe no banco. Detalhe: ${msg}`;
  if (/Configuração desconhecida/i.test(msg)) return `O banco ainda não aceita salvar essa configuração (falta liberar a chave em admin_setting_set). Detalhe: ${msg}`;
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha não conferem.";
  if (/Email not confirmed/i.test(msg)) return "Esse e-mail ainda não foi confirmado. Abra o link que chegou na caixa de entrada.";
  return msg;
}

async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args);
  if (error) throw new Error(ptErr(error));
  return data;
}

// ---------------------------------------------------------------- peças de interface
function toast(msg, err = false) {
  const box = $("#toasts");
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 2600);
}

const spinner = `<span class="spin" aria-hidden="true"></span>`;
const loadingHTML = (txt = "Carregando…") => `<div class="loading" role="status">${spinner}<span>${esc(txt)}</span></div>`;
function errorHTML(err) {
  return `<div class="error" role="alert"><strong>Não deu certo.</strong><span>${esc(ptErr(err))}</span><button class="btn sm ghost" data-retry>Tentar de novo</button></div>`;
}

// Deixa o botão ocupado enquanto a ação roda; erro vira toast com a mensagem do banco.
async function busy(btn, fn) {
  if (btn && btn.getAttribute("aria-busy") === "true") return undefined;
  const html = btn ? btn.innerHTML : "";
  if (btn) { btn.setAttribute("aria-busy", "true"); btn.disabled = true; btn.innerHTML = spinner + html; }
  try {
    return await fn();
  } catch (e) {
    toast(ptErr(e), true);
    return undefined;
  } finally {
    if (btn && btn.isConnected) { btn.removeAttribute("aria-busy"); btn.disabled = false; btn.innerHTML = html; }
  }
}

// CSV com BOM (Excel abre acentuado certo) e aspas escapadas; baixa na hora, sem passar por servidor.
function campoCSV(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function baixarCSV(nomeArquivo, colunas, linhas) {
  const corpo = [colunas.map((c) => campoCSV(c.titulo)).join(";")]
    .concat(linhas.map((l) => colunas.map((c) => campoCSV(c.valor(l))).join(";")))
    .join("\r\n");
  const blob = new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Lê CSV ; com campos entre aspas (o par da campoCSV acima). Primeira linha = cabeçalho.
function lerCSV(texto) {
  const linhas = texto.replace(/^﻿/, "").split(/\r\n|\n/).filter((l) => l.length);
  const parseLinha = (linha) => {
    const campos = [];
    let atual = "", aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (aspas) {
        if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; }
        else if (c === '"') aspas = false;
        else atual += c;
      } else if (c === '"') aspas = true;
      else if (c === ";") { campos.push(atual); atual = ""; }
      else atual += c;
    }
    campos.push(atual);
    return campos;
  };
  const [cabecalho, ...resto] = linhas.map(parseLinha);
  return resto.map((campos) => Object.fromEntries(cabecalho.map((h, i) => [h.trim(), campos[i] ?? ""])));
}

// Diálogos: cada um é um <dialog> novo, então dá para abrir uma confirmação por cima de um formulário.
function openDialog(html, { wide = false, onClose } = {}) {
  const d = document.createElement("dialog");
  d.className = "dlg" + (wide ? " wide" : "");
  d.innerHTML = `<div class="in">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener("close", () => { d.remove(); onClose && onClose(); });
  d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });
  $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => d.close()));
  d.showModal();
  return d;
}

function confirmBox({ title, text, ok = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    let res = false;
    const d = openDialog(
      `<h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}
       <div class="foot"><button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? "danger" : ""}" data-ok>${esc(ok)}</button></div>`,
      { onClose: () => resolve(res) },
    );
    $("[data-ok]", d).addEventListener("click", () => { res = true; d.close(); });
    $("[data-ok]", d).focus();
  });
}

const chip = (cls, txt) => `<span class="chip ${esc(cls)}">${esc(txt)}</span>`;
function statusChip(s, fem = true) {
  const t = { active: "No ar", hidden: fem ? "Escondida" : "Escondido", removed: fem ? "Removida" : "Removido" }[s] || s;
  return chip(s, t);
}
const roleChip = (r) => (r === "user" || !r ? `<span class="dim">Pessoa</span>` : chip(r, ROLE[r] || r));

function pagerHTML(total, offset, limit = PAGE) {
  total = Number(total || 0);
  if (!total) return "";
  const a = offset + 1, b = Math.min(offset + limit, total);
  return `<div class="pager"><span>${num(a)}–${num(b)} de ${num(total)}</span>
    <div class="actions"><button class="btn sm ghost" data-pg="-1" ${offset <= 0 ? "disabled" : ""}>Anterior</button>
    <button class="btn sm ghost" data-pg="1" ${b >= total ? "disabled" : ""}>Próxima</button></div></div>`;
}
function bindPager(root, state, reload) {
  $$("[data-pg]", root).forEach((b) => b.addEventListener("click", () => {
    state.offset = Math.max(0, state.offset + Number(b.dataset.pg) * PAGE);
    reload();
    root.scrollIntoView({ block: "start", behavior: "smooth" });
  }));
}

function counter(input, out, max) {
  const upd = () => { const n = input.value.length; out.textContent = `${n}/${max}`; out.classList.toggle("over", n > max); };
  input.addEventListener("input", upd);
  upd();
}

const telaOptions = (sel) => TELAS.map(([v, t]) => `<option value="${esc(v)}" ${v === (sel || "") ? "selected" : ""}>${esc(t)}</option>`).join("");
const telaNome = (v) => (TELAS.find(([k]) => k === (v || "")) || [, v])[1];

// Busca de cidade (city_search). value = {id, name, state} ou null.
function cityCombo(host, { value = null, onChange = () => {}, placeholder = "Buscar cidade…" } = {}) {
  let cur = value;
  const draw = () => {
    if (cur) {
      host.innerHTML = `<span class="picked">${esc(cur.name)} · ${esc(cur.state)} <button type="button" aria-label="Tirar a cidade">×</button></span>`;
      $("button", host).addEventListener("click", () => { cur = null; draw(); onChange(null); $("input", host)?.focus(); });
      return;
    }
    host.innerHTML = `<div class="combo"><input class="input" type="search" autocomplete="off" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"><div class="opts" hidden role="listbox"></div></div>`;
    const input = $("input", host), opts = $(".opts", host);
    let last = "";
    const search = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { opts.hidden = true; return; }
      last = q;
      opts.hidden = false;
      opts.innerHTML = `<div class="loading small">${spinner}Buscando…</div>`;
      try {
        const rows = (await rpc("city_search", { p_name: q, p_state: null })) || [];
        if (q !== last) return;
        opts.innerHTML = rows.length
          ? rows.map((c, i) => `<button type="button" role="option" data-i="${i}">${esc(c.name)} · ${esc(c.state)}</button>`).join("")
          : `<div class="empty small">Nenhuma cidade com esse nome.</div>`;
        $$("button", opts).forEach((b) => b.addEventListener("click", () => {
          const c = rows[Number(b.dataset.i)];
          cur = { id: c.id, name: c.name, state: c.state };
          draw();
          onChange(cur);
        }));
      } catch (e) {
        opts.innerHTML = `<div class="error small">${esc(ptErr(e))}</div>`;
      }
    }, 250);
    input.addEventListener("input", search);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") { const b = $("button", opts); if (b) { ev.preventDefault(); b.focus(); } }
      if (ev.key === "Escape") opts.hidden = true;
    });
    opts.addEventListener("keydown", (ev) => {
      const list = $$("button", opts), i = list.indexOf(document.activeElement);
      if (ev.key === "ArrowDown" && i < list.length - 1) { ev.preventDefault(); list[i + 1].focus(); }
      if (ev.key === "ArrowUp") { ev.preventDefault(); (i > 0 ? list[i - 1] : input).focus(); }
      if (ev.key === "Escape") { opts.hidden = true; input.focus(); }
    });
    host.addEventListener("focusout", () => setTimeout(() => { if (!host.contains(document.activeElement)) opts.hidden = true; }, 120));
  };
  draw();
  return { get: () => cur };
}

// Medalha: desenho dos pingentes (pingentes.js) quando carregou; senão um disco simples.
function medalArt(id, { ok = false, prog = 0, size = 64 } = {}) {
  const P = window.PINGENTES;
  const p = P && P.get && P.get(id);
  if (p) {
    try { return P.medal(p.art, { size, state: ok ? "on" : "lock", prog, cat: p.cat }); } catch { /* cai no disco */ }
  }
  const nome = MEDALHAS[id] || id;
  return `<span class="medal-fallback ${ok ? "on" : ""}" style="width:${size}px;height:${size}px" aria-hidden="true">${esc(nome.slice(0, 1))}</span>`;
}
function medalName(id, forma) {
  if (id === "famosinha" && forma != null && FAMOSINHA[forma]) return FAMOSINHA[forma];
  return MEDALHAS[id] || window.PINGENTES?.get?.(id)?.t || id;
}

// ---------------------------------------------------------------- rotas
const ROUTES = {
  visao: { title: "Visão geral", admin: true, group: "Geral", render: viewVisao },
  pessoas: { title: "Pessoas", admin: true, group: "Geral", render: viewPessoas },
  pessoa: { title: "Pessoa", admin: true, hidden: true, parent: "pessoas", render: viewPessoa },
  push: { title: "Notificações", admin: true, group: "Geral", render: viewPush },
  denuncias: { title: "Denúncias", group: "Moderação", badge: "denuncias_abertas", render: viewDenuncias },
  fotos: { title: "Fotos na fila", group: "Moderação", badge: "fotos_na_fila", render: viewFotos },
  avaliacoes: { title: "Avaliações", group: "Moderação", render: (c) => viewMod(c, MOD.avaliacoes) },
  mensagens: { title: "Mensagens do mural", group: "Moderação", render: (c) => viewMod(c, MOD.mensagens) },
  relatos: { title: "Relatos", group: "Moderação", render: (c) => viewMod(c, MOD.relatos) },
  lugares: { title: "Lugares", group: "Conteúdo", render: viewLugares },
  servicos: { title: "Serviços de apoio", admin: true, group: "Conteúdo", render: viewServicos },
  config: { title: "Configurações", admin: true, group: "Ajustes", render: viewConfig },
  chaves: { title: "Chaves de API", admin: true, group: "Ajustes", render: viewChaves },
};
const canSee = (key) => !!ROUTES[key] && (!ROUTES[key].admin || me.role === "admin");
const homeRoute = () => (me.role === "admin" ? "visao" : "denuncias");

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  const [name, ...rest] = h.split("/");
  return { name, param: rest.join("/") };
}

function shellHTML() {
  const groups = {};
  for (const [k, r] of Object.entries(ROUTES)) {
    if (r.hidden || !canSee(k)) continue;
    (groups[r.group] ||= []).push([k, r]);
  }
  const nav = Object.entries(groups).map(([g, items]) =>
    `<div class="grp">${esc(g)}</div>` +
    items.map(([k, r]) => `<a href="#${k}" data-route="${k}">${esc(r.title)}${r.badge ? `<span class="badge" data-badge="${r.badge}" hidden></span>` : ""}</a>`).join(""),
  ).join("");
  const brand = `<a class="brand" href="#${homeRoute()}"><span class="wordmark">IRIS<b>A</b></span><span class="rule"></span><small>Painel da equipe</small></a>`;
  return `<div class="shell">
    <header class="topbar">${brand}<button class="btn sm ghost" id="menuBtn" aria-expanded="false" aria-controls="side">Menu</button></header>
    <aside class="side" id="side">${brand}<nav class="nav" aria-label="Seções">${nav}</nav>
      <div class="me"><span class="email">${esc(me.email)}</span>${roleChip(me.role)}<button class="btn sm ghost" id="logout">Sair</button></div>
    </aside>
    <main class="main" id="main" tabindex="-1"></main>
  </div>`;
}

async function refreshBadges() {
  try {
    const o = await rpc("admin_overview");
    $$("[data-badge]").forEach((b) => {
      const n = Number(o?.[b.dataset.badge] || 0);
      b.hidden = !n;
      b.textContent = n > 99 ? "99+" : String(n);
    });
  } catch { /* contador é enfeite: sem ele o painel segue */ }
}

function route() {
  const main = $("#main");
  if (!main) return;
  let { name, param } = parseHash();
  if (!name || !ROUTES[name]) { location.replace("#" + homeRoute()); return; }
  if (!canSee(name)) {
    main.innerHTML = `<div class="card"><h1>Sem acesso</h1><p class="muted" style="margin-top:8px">Essa parte do painel é só da administração.</p></div>`;
    return;
  }
  const r = ROUTES[name];
  $$("[data-route]").forEach((a) => {
    if (a.dataset.route === name || a.dataset.route === r.parent) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.body.classList.remove("menu-open");
  $("#menuBtn")?.setAttribute("aria-expanded", "false");
  document.title = `${r.title} · Irisa · Painel`;
  const seq = ++viewSeq;
  const ctx = {
    el: main,
    param,
    alive: () => seq === viewSeq,
  };
  main.innerHTML = "";
  window.scrollTo(0, 0);
  Promise.resolve(r.render(ctx)).catch((e) => { if (ctx.alive()) main.innerHTML = errorHTML(e); bindRetry(main, route); });
}

function bindRetry(root, fn) { $$("[data-retry]", root).forEach((b) => b.addEventListener("click", fn)); }

const headHTML = (title, lead, extra = "") =>
  `<div class="head"><div><h1>${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div>${extra}</div>`;

// Carrega com estado de espera e erro com "tentar de novo" dentro de um bloco.
async function load(box, fn, ctx) {
  box.innerHTML = loadingHTML();
  try {
    await fn();
  } catch (e) {
    if (ctx && !ctx.alive()) return;
    box.innerHTML = errorHTML(e);
    bindRetry(box, () => load(box, fn, ctx));
  }
}

// ================================================================ 1. Visão geral
async function viewVisao(ctx) {
  ctx.el.innerHTML = headHTML("Visão geral", "Como a Irisa está agora, no Brasil todo. Dias contados no horário de Brasília.") + `<div id="vbox"></div>`;
  const box = $("#vbox", ctx.el);
  await load(box, async () => {
    const [o, medals, d7, d30] = await Promise.all([
      rpc("admin_overview"),
      rpc("admin_medals").catch((e) => ({ erro: e })),
      rpc("admin_discovery", { p_days: 7 }).catch((e) => ({ erro: e })),
      rpc("admin_discovery", { p_days: 30 }).catch((e) => ({ erro: e })),
    ]);
    if (!ctx.alive()) return;
    const tile = (k, label, href, alert) => {
      const v = Number(o?.[k] ?? 0);
      const inner = `<b>${num(v)}</b><span>${esc(label)}</span>`;
      return href ? `<a class="tile ${alert && v ? "alert" : ""}" href="${href}">${inner}</a>` : `<div class="tile">${inner}</div>`;
    };
    const serie = Array.isArray(o?.serie) ? o.serie : [];
    box.innerHTML = `
      <h2 class="sec-title">Pede atenção</h2>
      <div class="tiles">
        ${tile("denuncias_abertas", "Denúncias abertas", "#denuncias", true)}
        ${tile("fotos_na_fila", "Fotos esperando aprovação", "#fotos", true)}
        ${tile("pushs_agendados", "Notificações agendadas", "#push")}
      </div>
      <h2 class="sec-title">Pessoas</h2>
      <div class="tiles">
        ${tile("usuarios", "Contas no total")}
        ${tile("novos_7d", "Contas novas em 7 dias")}
        ${tile("ativos_hoje", "Abriram o app hoje")}
        ${tile("ativos_7d", "Abriram em 7 dias")}
        ${tile("ativos_30d", "Abriram em 30 dias")}
        ${tile("aparelhos_push", "Aparelhos que recebem notificação")}
      </div>
      <h2 class="sec-title">Últimos 14 dias</h2>
      <div class="charts">
        ${chartCard(serie, "ativos", "Abriram o app", "pessoa", "pessoas", "media")}
        ${chartCard(serie, "avaliacoes", "Avaliações", "avaliação", "avaliações", "soma")}
        ${chartCard(serie, "novos", "Contas novas", "conta", "contas", "soma")}
      </div>
      <details class="card" style="margin-bottom:18px"><summary style="cursor:pointer;font-weight:600">Ver os 14 dias em tabela</summary>
        <div class="table-wrap" style="box-shadow:none;margin-top:10px"><table><thead><tr><th>Dia</th><th class="r">Abriram o app</th><th class="r">Avaliações</th><th class="r">Contas novas</th></tr></thead>
        <tbody>${serie.map((d) => `<tr><td>${esc(fmtDay(d.dia))}</td><td class="r num">${num(d.ativos)}</td><td class="r num">${num(d.avaliacoes)}</td><td class="r num">${num(d.novos)}</td></tr>`).join("")}</tbody></table></div>
      </details>
      <h2 class="sec-title">Conteúdo</h2>
      <div class="tiles">
        ${tile("avaliacoes_total", "Avaliações no ar")}
        ${tile("avaliacoes_7d", "Avaliações em 7 dias")}
        ${tile("mensagens_7d", "Mensagens no mural em 7 dias")}
        ${tile("relatos_7d", "Relatos em 7 dias")}
        ${tile("lugares_ativos", "Lugares no mapa")}
        ${tile("lugares_novos_7d", "Lugares cadastrados por pessoas em 7 dias")}
        ${tile("lugares_com_selo", "Lugares com selo (5 avaliações ou mais)")}
        ${tile("medalhas_7d", "Medalhas conquistadas em 7 dias")}
      </div>
      <h2 class="sec-title">Descoberta <span class="small dim" style="font-weight:400">· cartão “Passou por aqui?” do Início</span></h2>
      <div id="discBox"></div>
      <h2 class="sec-title">Medalhas mais conquistadas</h2>
      <div id="medalsTop"></div>`;
    bindCharts(box);
    const db = $("#discBox", box);
    if (d7?.erro && d30?.erro) { db.innerHTML = errorHTML(d7.erro); bindRetry(db, route); }
    else db.innerHTML = `<div class="grid2 disc-grid">${discoveryCard(d7, 7)}${discoveryCard(d30, 30)}</div>`;
    const mt = $("#medalsTop", box);
    if (medals && medals.erro) { mt.innerHTML = errorHTML(medals.erro); bindRetry(mt, route); }
    else if (!medals || !medals.length) mt.innerHTML = `<div class="card empty">Ninguém conquistou medalha ainda.</div>`;
    else mt.innerHTML = `<div class="medals-top">${medals.map((m) => `
      <div class="medal-row">${medalArt(m.medalha, { ok: true, size: 44 })}
        <div><div style="font-weight:600">${esc(medalName(m.medalha))}</div><div class="small dim">última ${esc(rel(m.ultima))}</div></div>
        <div class="n"><b>${num(m.pessoas)}</b><span class="small dim">${Number(m.pessoas) === 1 ? "pessoa" : "pessoas"}</span></div>
      </div>`).join("")}</div>`;
  }, ctx);
}

// Funil da descoberta: viram → abriram a ficha → começaram a avaliar → concluíram.
// Cada etapa mostra o % sobre a anterior; a barra é sempre proporcional a quem viu.
function discoveryCard(d, dias) {
  if (!d || d.erro) return `<div class="card">${errorHTML(d?.erro || new Error("Sem dados."))}</div>`;
  const n = (k) => Number(d[k] || 0);
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const base = n("impressoes");
  const etapas = [
    ["impressoes", "Viram o cartão", null],
    ["abertas", "Abriram a ficha", "impressoes"],
    ["comecadas", "Começaram a avaliar", "abertas"],
    ["concluidas", "Concluíram a avaliação", "comecadas"],
  ];
  const rows = etapas.map(([k, label, prev]) => {
    const w = base ? Math.max(2, Math.round((n(k) / base) * 100)) : 0;
    return `<div class="funnel-row">
      <div class="funnel-lb"><span>${esc(label)}</span><b>${num(n(k))}</b>${prev ? `<em title="sobre a etapa anterior">${pct(n(k), n(prev))}</em>` : "<em></em>"}</div>
      <div class="funnel-bar"><i style="width:${w}%"></i></div></div>`;
  }).join("");
  const novas = n("avaliacoes_novas");
  return `<div class="card disc-card">
    <div class="card-head" style="margin-bottom:10px"><h3>Últimos ${dias} dias</h3><span class="small dim">${plural(n("pessoas"), "pessoa viu", "pessoas viram")}</span></div>
    ${base ? rows : `<p class="small muted">Ninguém viu o cartão nesse período.</p>`}
    <div class="disc-foot">
      <div><b>${pct(n("concluidas"), base)}</b><span>de quem viu avaliou</span></div>
      <div><b>${num(n("nao_conheco"))}</b><span>“Não conheço”</span></div>
      <div><b>${num(n("fechadas"))}</b><span>fecharam no X</span></div>
      <div><b>${pct(n("concluidas"), novas)}</b><span>das ${num(novas)} avaliações novas vieram daqui</span></div>
    </div></div>`;
}

// Gráfico de barras pequeno, uma série por gráfico (nada de dois eixos). Passar o mouse mostra o dia.
function chartCard(serie, key, title, um, varios, resumo) {
  const W = 420, H = 170, L = 30, R = 8, T = 16, B = 24;
  const iw = W - L - R, ih = H - T - B;
  const vals = serie.map((d) => Number(d[key] || 0));
  const max = Math.max(0, ...vals);
  const step = max <= 4 ? 1 : Math.ceil(max / 4 / (max > 40 ? 5 : 1)) * (max > 40 ? 5 : 1);
  const top = Math.max(step * Math.ceil(max / step), step);
  const n = Math.max(serie.length, 1);
  const cw = iw / n, bw = Math.max(cw - 4, 2);
  const y = (v) => T + ih - (v / top) * ih;
  let grid = "";
  for (let v = 0; v <= top; v += step) {
    grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  }
  const bars = serie.map((d, i) => {
    const v = vals[i], x = L + i * cw + (cw - bw) / 2, yy = y(v), h = T + ih - yy, r = Math.min(4, h, bw / 2);
    const path = h > 0 ? `M${x} ${T + ih}V${yy + r}Q${x} ${yy} ${x + r} ${yy}H${x + bw - r}Q${x + bw} ${yy} ${x + bw} ${yy + r}V${T + ih}Z` : "";
    const label = `${fmtDay(d.dia)}: ${plural(v, um, varios)}`;
    const xl = i % 2 === (n - 1) % 2 ? `<text class="axis" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(fmtDay(d.dia))}</text>` : "";
    const last = i === n - 1 && v > 0 ? `<text class="val" x="${x + bw / 2}" y="${yy - 4}" text-anchor="middle">${v}</text>` : "";
    return `<g><rect class="hit" x="${L + i * cw}" y="${T}" width="${cw}" height="${ih}" fill="transparent" data-tip="${esc(label)}"><title>${esc(label)}</title></rect><path class="bar" d="${path}"/>${last}${xl}</g>`;
  }).join("");
  const sum = vals.reduce((a, b) => a + b, 0);
  const head = resumo === "media"
    ? `<span class="total">${num(Math.round((sum / n) * 10) / 10)}</span> <span class="small dim">por dia, em média</span>`
    : `<span class="total">${num(sum)}</span> <span class="small dim">em 14 dias</span>`;
  return `<div class="card chart"><div class="card-head" style="margin-bottom:6px"><h3>${esc(title)}</h3><div>${head}</div></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} por dia nos últimos 14 dias">${grid}${bars}</svg>
    <div class="tip" aria-live="polite">Passe o mouse ou toque numa barra para ver o dia.</div></div>`;
}
function bindCharts(root) {
  $$(".chart", root).forEach((c) => {
    const tip = $(".tip", c);
    $$(".hit", c).forEach((h) => {
      const on = () => { $$(".bar", c).forEach((b) => b.classList.remove("hl")); h.nextElementSibling.classList.add("hl"); tip.textContent = h.dataset.tip; };
      h.addEventListener("mouseenter", on);
      h.addEventListener("click", on);
    });
  });
}

// ================================================================ 2. Pessoas
const pessoasState = { busca: "", ordem: "recente", offset: 0 };
async function viewPessoas(ctx) {
  ctx.el.innerHTML = headHTML("Pessoas", "Quem tem conta na Irisa. Toque numa linha para ver a pessoa. Relatos nunca aparecem aqui: são anônimos também para a equipe.") + `
    <div class="toolbar">
      <input class="input" type="search" id="pBusca" placeholder="Buscar por apelido ou e-mail" aria-label="Buscar por apelido ou e-mail" value="${esc(pessoasState.busca)}">
      <label class="sr-only" for="pOrdem">Ordem</label>
      <select class="input" id="pOrdem">
        <option value="recente">Cadastro mais recente</option>
        <option value="ativo">Abriu o app por último</option>
        <option value="interacao">Interagiu por último</option>
      </select>
    </div><div id="pbox"></div>`;
  $("#pOrdem", ctx.el).value = pessoasState.ordem;
  const box = $("#pbox", ctx.el);
  const reload = () => load(box, async () => {
    const rows = (await rpc("admin_users", { p_busca: pessoasState.busca || null, p_limite: PAGE, p_offset: pessoasState.offset, p_ordem: pessoasState.ordem })) || [];
    if (!ctx.alive()) return;
    const total = rows[0]?.total || 0;
    box.innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Pessoa</th><th>Cidade</th><th>Cadastro</th><th>Abriu o app</th><th class="r">Dias em 30</th><th>Última interação</th><th>Notificação</th><th class="r">Avaliações</th><th class="r">Mensagens</th><th class="r">Medalhas</th><th>Papel</th></tr></thead>
      <tbody>${rows.map((u) => `<tr class="click" tabindex="0" data-id="${esc(u.id)}">
        <td><div class="who">${esc(u.apelido || "Sem apelido")}</div><div class="sub">${esc(u.email || "sem e-mail")}</div></td>
        <td class="nowrap">${esc(u.cidade || "—")}</td>
        <td class="nowrap">${esc(fmtD(u.criado_em))}<div class="sub">${esc(rel(u.criado_em))}</div></td>
        <td class="nowrap">${!u.ultimo_dia ? `<span class="dim">nunca</span>` : relDay(u.ultimo_dia) === "hoje" ? chip("today", "hoje") : esc(relDay(u.ultimo_dia))}</td>
        <td class="r num">${num(u.dias_30)}</td>
        <td class="nowrap">${when(u.ultima_interacao)}</td>
        <td>${u.tem_push ? "sim" : `<span class="dim">não</span>`}</td>
        <td class="r num">${num(u.avaliacoes)}</td>
        <td class="r num">${num(u.mensagens)}</td>
        <td class="r num">${num(u.medalhas)}</td>
        <td>${roleChip(u.papel)}</td></tr>`).join("")}</tbody></table></div>${pagerHTML(total, pessoasState.offset)}`
      : `<div class="card empty">${pessoasState.busca ? "Ninguém com esse apelido ou e-mail." : "Nenhuma conta ainda."}</div>`;
    $$("tr[data-id]", box).forEach((tr) => {
      const go = () => { location.hash = "#pessoa/" + tr.dataset.id; };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); });
    });
    bindPager(box, pessoasState, reload);
  }, ctx);
  $("#pBusca", ctx.el).addEventListener("input", debounce((ev) => { pessoasState.busca = ev.target.value.trim(); pessoasState.offset = 0; reload(); }));
  $("#pOrdem", ctx.el).addEventListener("change", (ev) => { pessoasState.ordem = ev.target.value; pessoasState.offset = 0; reload(); });
  await reload();
}

// ================================================================ 3. Pessoa
async function viewPessoa(ctx) {
  const id = ctx.param;
  ctx.el.innerHTML = `<a class="back" href="#pessoas">← Pessoas</a><div id="ubox"></div>`;
  const box = $("#ubox", ctx.el);
  const reload = () => load(box, async () => {
    const u = await rpc("admin_user", { p_id: id });
    if (!ctx.alive()) return;
    renderPessoa(box, u, reload);
  }, ctx);
  await reload();
}

function renderPessoa(box, u, reload) {
  const g = u.gamificacao || {};
  const nome = u.apelido || "Sem apelido";
  const iniciais = nome.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const forma = u.forma ?? 2;
  const conquistadas = Object.fromEntries((u.conquistadas || []).map((c) => [c.id, c]));

  // 60 dias, do mais antigo ao de hoje
  const dias = Object.fromEntries((u.dias || []).map((d) => [String(d.dia).slice(0, 10), d]));
  const hoje = todaySP(), base = dayNum(hoje);
  const strip = [];
  for (let i = 59; i >= 0; i--) {
    const t = new Date((base - i) * 864e5).toISOString().slice(0, 10);
    const d = dias[t];
    const parts = [fmtDay(t)];
    if (d) parts.push("abriu o app");
    if (d?.consultou) parts.push("abriu a ficha de um lugar");
    if (d?.apoiou) parts.push("escreveu no mural");
    if (!d) parts.push("não abriu");
    strip.push(`<span class="d ${d ? "on" : ""} ${t === hoje ? "today" : ""}" title="${esc(parts.join(" · "))}">${d?.consultou ? `<i></i>` : ""}${d?.apoiou ? `<i class="ap"></i>` : ""}</span>`);
  }
  const abertos = (u.dias || []).filter((d) => base - dayNum(d.dia) < 60).length;

  const gomos = Number(g.gomos || 0);
  const ring = Array.from({ length: 48 }, (_, i) => `<i style="${i < gomos ? `background:${GOMOS[i % 16]}` : ""}"></i>`).join("");
  const semana = g.semana || {};
  const faiscas = g.faiscas || {};

  const medalhas = (g.medalhas || []).map((m) => {
    const c = conquistadas[m.id];
    const ok = !!c || !!m.ok;
    const prog = m.alvo ? Math.min(1, Number(m.valor || 0) / Number(m.alvo)) : 0;
    return `<div class="medal">${medalArt(m.id, { ok, prog })}
      <div class="t">${esc(medalName(m.id, forma))}</div>
      <div class="s">${c ? `desde ${esc(fmtD(c.em))}` : ok ? "liberada, ainda não gravada" : `${num(m.valor)}/${num(m.alvo)}`}</div>
      ${c?.banho ? chip(c.banho, `Banho ${BANHO[c.banho] || c.banho}`) : ""}</div>`;
  }).join("");

  const aparelhos = (u.aparelhos || []).map((a) => `${esc(a.plataforma === "ios" ? "iPhone" : a.plataforma === "android" ? "Android" : a.plataforma || "?")} <span class="dim">(${esc(rel(a.atualizado))})</span>`).join(", ") || `<span class="dim">nenhum</span>`;

  const statusBtn = (type, it) => it.status === "active"
    ? `<button class="btn sm warn" data-st="${type}" data-id="${esc(it.id)}" data-to="hidden">Esconder</button>`
    : `<button class="btn sm ok" data-st="${type}" data-id="${esc(it.id)}" data-to="active">Voltar ao ar</button>`;

  const avals = (u.avaliacoes || []).map((a) => `<div class="it"><div class="txt">
      <div><strong>${esc(a.lugar)}</strong> · nota ${a.nota != null ? esc(Number(a.nota).toFixed(1)) : "—"} · ${statusChip(a.status)} <span class="small dim">${esc(rel(a.em))}</span></div>
      ${a.comentario ? `<p class="muted">${esc(a.comentario)}</p>` : `<p class="small dim">sem comentário</p>`}</div>${statusBtn("rating", a)}</div>`).join("");
  const msgs = (u.mensagens || []).map((m) => `<div class="it"><div class="txt">
      <div>${chip("", CAT_MURAL[m.categoria] || m.categoria)} ${statusChip(m.status)} <span class="small dim">${esc(rel(m.em))}</span></div>
      <p class="muted" style="margin-top:4px">${esc(m.conteudo)}</p></div>${statusBtn("message", m)}</div>`).join("");
  const lugares = (u.lugares || []).map((l) => `<div class="it"><div class="txt"><strong>${esc(l.nome)}</strong> ${statusChip(l.status, false)} <span class="small dim">${esc(fmtD(l.em))}</span></div>
      <button class="btn sm ghost" data-lugar="${esc(l.nome)}">Ver em Lugares</button></div>`).join("");

  box.innerHTML = `
    <div class="note info"><span><strong>Relatos nunca aparecem aqui:</strong> são anônimos também para a equipe. A foto de perfil é privada e também não aparece.</span></div>
    <div class="card">
      <div class="person"><div class="avatar" aria-hidden="true">${esc(iniciais)}</div>
        <div class="meta"><div class="name">${esc(nome)}</div><div class="muted">${esc(u.email || "sem e-mail")}</div><div>${roleChip(u.papel)}</div></div></div>
      <div class="kv">
        <div><span class="k">Cidade</span><span class="v">${esc(u.cidade || "—")}</span></div>
        <div><span class="k">Cadastro</span><span class="v">${esc(fmtDT(u.criado_em))}</span></div>
        <div><span class="k">Último login</span><span class="v">${esc(fmtDT(u.ultimo_login))}</span></div>
        <div><span class="k">Medalhas chamam de</span><span class="v">${esc(FAMOSINHA[forma] || "—")}</span></div>
        <div><span class="k">Notificação</span><span class="v">${aparelhos}</span></div>
        <div><span class="k">Notificações abertas</span><span class="v">${num(u.pushs_abertos)}</span></div>
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>Atividade</h2><p class="small muted" style="margin:4px 0 12px">Abriu o app em ${plural(abertos, "dia", "dias")} dos últimos 60.</p>
        <div class="strip" role="img" aria-label="Dias em que abriu o app nos últimos 60 dias">${strip.join("")}</div>
        <div class="strip-legend"><span><i class="sw on"></i>abriu o app</span><span><i class="sw"></i>não abriu</span><span><i class="dot" style="background:var(--ink)"></i>abriu a ficha de um lugar</span><span><i class="dot" style="background:var(--coral-ink)"></i>escreveu no mural</span></div>
      </div>
      <div class="card"><h2>Gamificação</h2>
        <div class="kv">
          <div><span class="k">Anel</span><span class="v">${num(gomos)}/48 gomos</span></div>
          <div><span class="k">Nível</span><span class="v">${esc(NIVEIS[g.nivel] ?? "—")}</span></div>
          <div><span class="k">Semana</span><span class="v">${num(semana.dias ?? 0)}/4 dias ${semana.acesa ? chip("on", "acesa") : ""}</span></div>
          <div><span class="k">Semanas acesas</span><span class="v">${num(g.semanas_acesas ?? 0)}</span></div>
          <div><span class="k">Faíscas</span><span class="v">${num(faiscas.total ?? 0)} <span class="small dim">(${num(faiscas.rumo ?? 0)}/10 para a próxima)</span></span></div>
          <div><span class="k">Caixinhas para abrir</span><span class="v">${num(g.caixinhas ?? 0)}</span></div>
          <div><span class="k">Avaliações que contam</span><span class="v">${num(g.avaliacoes ?? 0)}</span></div>
        </div>
        <div class="ring" aria-hidden="true">${ring}</div>
      </div>
    </div>
    <div class="card"><h2>Medalhas</h2><p class="small muted" style="margin:4px 0 12px">${plural(Object.keys(conquistadas).length, "conquistada", "conquistadas")}. Nas outras, o anel mostra quanto falta.</p>
      <div class="medals">${medalhas || `<p class="dim">Sem dados de medalha.</p>`}</div></div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>Avaliações</h2><div class="list" style="margin-top:6px">${avals || `<p class="dim" style="padding:10px 0">Nenhuma avaliação.</p>`}</div></div>
      <div class="card"><h2>Mensagens no mural</h2><div class="list" style="margin-top:6px">${msgs || `<p class="dim" style="padding:10px 0">Nenhuma mensagem.</p>`}</div></div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h2>Lugares que cadastrou</h2><div class="list" style="margin-top:6px">${lugares || `<p class="dim" style="padding:10px 0">Nenhum lugar.</p>`}</div></div>
      <div class="card"><h2>Papel e ações</h2>
        <div class="form" style="margin-top:10px">
          <div class="row"><label class="f">Papel no app
            <select class="input" id="uRole"><option value="user">Pessoa (sem acesso ao painel)</option><option value="moderator">Moderação (modera e cuida dos lugares)</option><option value="admin">Administração (tudo)</option></select></label>
            <button class="btn" id="uRoleSave">Salvar papel</button></div>
          <div class="note danger" style="margin:6px 0 0"><span>Esconde todas as avaliações e mensagens no ar dessa pessoa. Dá para voltar uma a uma depois.</span></div>
          <div><button class="btn danger" id="uHideAll">Esconder tudo o que essa pessoa publicou</button></div>
        </div>
      </div>
    </div>`;

  $("#uRole", box).value = u.papel || "user";
  $("#uRoleSave", box).addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
    const papel = $("#uRole", box).value;
    if (papel === u.papel) { toast("Nada mudou"); return; }
    await rpc("admin_set_role", { p_id: u.id, p_role: papel });
    u.papel = papel;
    toast("Salvo");
  }));
  $("#uHideAll", box).addEventListener("click", async (ev) => {
    const ok = await confirmBox({ title: "Esconder tudo dessa pessoa?", text: `Todas as avaliações e mensagens no ar de ${nome} saem do app. Dá para voltar uma a uma depois.`, ok: "Esconder tudo", danger: true });
    if (!ok) return;
    await busy(ev.currentTarget, async () => {
      const r = await rpc("admin_hide_user_content", { p_id: u.id });
      toast(`Escondido: ${plural(r?.avaliacoes ?? 0, "avaliação", "avaliações")} e ${plural(r?.mensagens ?? 0, "mensagem", "mensagens")}`);
      reload();
    });
  });
  $$("[data-st]", box).forEach((b) => b.addEventListener("click", () => busy(b, async () => {
    await rpc("admin_set_status", { p_type: b.dataset.st, p_id: b.dataset.id, p_status: b.dataset.to });
    const list = b.dataset.st === "rating" ? u.avaliacoes : u.mensagens;
    const it = list.find((x) => x.id === b.dataset.id);
    if (it) it.status = b.dataset.to;
    toast(b.dataset.to === "active" ? "De volta ao ar" : "Escondido");
    renderPessoa(box, u, reload);
  })));
  $$("[data-lugar]", box).forEach((b) => b.addEventListener("click", () => {
    Object.assign(lugaresState, { busca: b.dataset.lugar, cidade: null, status: null, offset: 0 });
    location.hash = "#lugares";
  }));
}

// ================================================================ 4. Notificações
async function viewPush(ctx) {
  ctx.el.innerHTML = headHTML("Notificações", "Mande um aviso para o celular de quem usa a Irisa. Só chega em quem tem a versão com notificação e deixou receber.") + `
    <div class="grid2">
      <form class="card form" id="pushForm" novalidate>
        <h2>Nova notificação</h2>
        <div class="note"><span><strong>Notificação aparece na tela bloqueada</strong>, na frente de qualquer pessoa. Nada de nome de lugar, nada de “LGBT”, relato ou violência no título. Texto neutro, que não exponha quem recebe.</span></div>
        <label class="f">Título <input class="input" id="nTitulo" maxlength="65" required placeholder="Ex.: Tem lugar novo na sua cidade"></label>
        <span class="counter" id="cTitulo"></span>
        <label class="f">Texto <textarea class="input" id="nCorpo" maxlength="240" rows="3" required placeholder="Ex.: Conta pra gente como foi. Leva um minuto."></textarea></label>
        <span class="counter" id="cCorpo"></span>
        <div class="note danger" id="nAviso" hidden></div>
        <label class="f">Tela que abre ao tocar <select class="input" id="nUrl">${telaOptions("")}</select></label>
        <div class="f"><span style="font-weight:500;font-size:13px;color:var(--muted)">Cidade <span class="hint">(vazio = todo mundo)</span></span><div id="nCidade"></div></div>
        <div class="f"><span style="font-weight:500;font-size:13px;color:var(--muted)">Quando</span>
          <div class="seg" role="group" aria-label="Quando enviar"><button type="button" data-q="agora" aria-pressed="true">Agora</button><button type="button" data-q="agendar" aria-pressed="false">Agendar</button></div>
          <input class="input" type="datetime-local" id="nQuando" hidden aria-label="Data e hora (horário de Brasília)">
          <span class="hint" id="nQuandoHint" hidden>Horário de Brasília.</span>
        </div>
        <p class="reach" id="nAlcance">${spinner} Calculando alcance…</p>
        <div><button class="btn" type="submit" id="nEnviar">Enviar agora</button></div>
      </form>
      <div class="card"><h2>Como aparece</h2><p class="small muted" style="margin:4px 0 14px">Prévia aproximada da tela bloqueada.</p>
        <div class="phone"><div class="clock" id="pClock"></div><div class="date" id="pDate"></div>
          <div class="notif"><span class="ic"></span><div class="app"><span>IRISA</span><span>agora</span></div><div class="tt" id="pTitulo"></div><div class="bd" id="pCorpo"></div></div>
        </div>
      </div>
    </div>
    <div class="card"><div class="card-head"><h2>Enviadas e agendadas</h2><button class="btn sm ghost" id="pushReload">Atualizar</button></div><div id="pushList"></div></div>`;

  const f = $("#pushForm", ctx.el);
  const t = $("#nTitulo", f), c = $("#nCorpo", f), quando = $("#nQuando", f);
  let modo = "agora", cidade = null, alcance = null;
  counter(t, $("#cTitulo", f), 65);
  counter(c, $("#cCorpo", f), 240);

  const now = new Date();
  $("#pClock", ctx.el).textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(now);
  $("#pDate", ctx.el).textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(now);
  const preview = () => {
    $("#pTitulo", ctx.el).textContent = t.value.trim() || "Título da notificação";
    $("#pCorpo", ctx.el).textContent = c.value.trim() || "O texto aparece aqui.";
    const m = (t.value + " " + c.value).match(PALAVRAS_SENSIVEIS);
    const av = $("#nAviso", f);
    av.hidden = !m;
    if (m) av.innerHTML = `<span>Evite “${esc(m[0])}”: aparece na tela bloqueada de quem recebe.</span>`;
  };
  t.addEventListener("input", preview);
  c.addEventListener("input", preview);
  preview();

  const updAlcance = async () => {
    const el = $("#nAlcance", f);
    el.innerHTML = `${spinner} Calculando alcance…`;
    try {
      alcance = Number(await rpc("admin_push_alcance", { p_cidade: cidade ? cidade.id : null }));
      el.textContent = `Vai chegar em até ${plural(alcance, "aparelho", "aparelhos")}${cidade ? ` de quem tem ${cidade.name} como cidade` : " (todo mundo)"}.`;
    } catch (e) {
      el.innerHTML = `<span style="color:var(--coral-ink)">${esc(ptErr(e))}</span>`;
    }
  };
  cityCombo($("#nCidade", f), { onChange: (v) => { cidade = v; updAlcance(); }, placeholder: "Buscar cidade (opcional)" });
  updAlcance();

  $$("[data-q]", f).forEach((b) => b.addEventListener("click", () => {
    modo = b.dataset.q;
    $$("[data-q]", f).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    quando.hidden = modo !== "agendar";
    $("#nQuandoHint", f).hidden = modo !== "agendar";
    $("#nEnviar", f).textContent = modo === "agendar" ? "Agendar" : "Enviar agora";
    if (modo === "agendar") {
      const min = new Date(Date.now() + 10 * 60000);
      const loc = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(min).replace(" ", "T");
      quando.min = loc;
      if (!quando.value) quando.value = loc;
      quando.focus();
    }
  }));

  f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const titulo = t.value.trim(), corpo = c.value.trim();
    if (!titulo || !corpo) { toast("Escreva o título e o texto.", true); (titulo ? c : t).focus(); return; }
    let iso = new Date().toISOString(), quandoTxt = "agora";
    if (modo === "agendar") {
      if (!quando.value) { toast("Escolha a data e a hora.", true); quando.focus(); return; }
      iso = quando.value + ":00-03:00"; // Brasil sem horário de verão desde 2019
      if (new Date(iso).getTime() < Date.now() + 60000) { toast("Escolha um horário no futuro.", true); quando.focus(); return; }
      quandoTxt = "em " + fmtDT(iso);
    }
    const ok = await confirmBox({
      title: modo === "agendar" ? "Agendar notificação?" : "Enviar agora?",
      text: `“${titulo}” vai para ${alcance != null ? `até ${plural(alcance, "aparelho", "aparelhos")}` : "os aparelhos"} ${cidade ? `de ${cidade.name}` : "do Brasil todo"}, ${quandoTxt}. Depois de enviada não dá para apagar do celular de ninguém.`,
      ok: modo === "agendar" ? "Agendar" : "Enviar",
    });
    if (!ok) return;
    await busy($("#nEnviar", f), async () => {
      await rpc("admin_push_create", { p_titulo: titulo, p_corpo: corpo, p_quando: iso, p_url: $("#nUrl", f).value || null, p_cidade: cidade ? cidade.id : null });
      toast(modo === "agendar" ? "Notificação agendada" : "Notificação na fila de envio");
      t.value = ""; c.value = ""; t.dispatchEvent(new Event("input")); c.dispatchEvent(new Event("input"));
      loadList();
    });
  });

  const listBox = $("#pushList", ctx.el);
  const loadList = () => load(listBox, async () => {
    const rows = (await rpc("admin_push_list", { p_limite: 100 })) || [];
    if (!ctx.alive()) return;
    listBox.innerHTML = rows.length ? `<div class="table-wrap" style="box-shadow:none"><table>
      <thead><tr><th>Quando</th><th>Notificação</th><th>Para</th><th>Status</th><th class="r">Aparelhos</th><th class="r">Aceitos</th><th class="r">Falhas</th><th class="r">Abriram</th><th></th></tr></thead>
      <tbody>${rows.map((p) => {
        const pct = p.aceitos ? Math.round((Number(p.aberturas || 0) / Number(p.aceitos)) * 100) : null;
        return `<tr>
          <td class="nowrap">${esc(fmtDT(p.enviar_em))}<div class="sub">${esc(rel(p.enviar_em))}</div></td>
          <td class="text" style="min-width:220px"><strong>${esc(p.titulo)}</strong><div class="muted">${esc(p.corpo)}</div>${p.url ? `<div class="sub">abre: ${esc(telaNome(p.url))}</div>` : ""}${p.erro ? `<div class="sub" style="color:var(--coral-ink)">${esc(p.erro)}</div>` : ""}</td>
          <td>${esc(p.cidade || "Todo mundo")}</td>
          <td>${chip(p.status, PUSH_STATUS[p.status] || p.status)}</td>
          <td class="r num">${p.aparelhos == null ? "—" : num(p.aparelhos)}</td>
          <td class="r num">${p.aceitos == null ? "—" : num(p.aceitos)}</td>
          <td class="r num">${p.falhas == null ? "—" : num(p.falhas)}</td>
          <td class="r num nowrap">${num(p.aberturas || 0)}${pct != null ? ` <span class="sub">(${pct}%)</span>` : ""}</td>
          <td>${p.status === "agendada" ? `<button class="btn sm ghost" data-cancel="${esc(p.id)}">Cancelar</button>` : ""}</td></tr>`;
      }).join("")}</tbody></table></div>` : `<div class="empty">Nenhuma notificação ainda.</div>`;
    $$("[data-cancel]", listBox).forEach((b) => b.addEventListener("click", async () => {
      const ok = await confirmBox({ title: "Cancelar essa notificação?", text: "Ela não vai ser enviada. Para mandar depois, crie de novo.", ok: "Cancelar envio", danger: true });
      if (!ok) return;
      await busy(b, async () => { await rpc("admin_push_cancel", { p_id: Number(b.dataset.cancel) }); toast("Cancelada"); loadList(); });
    }));
  }, ctx);
  $("#pushReload", ctx.el).addEventListener("click", loadList);
  await loadList();
}

// ================================================================ 5, 6, 7. Avaliações, mensagens, relatos
const MOD = {
  avaliacoes: {
    key: "avaliacoes", title: "Avaliações", rpc: "admin_ratings", type: "rating", fem: true, search: "Buscar por lugar ou comentário",
    lead: "Todas as avaliações de lugares. Esconder tira do app e da nota do lugar; dá para voltar depois.",
    tabs: ["Todas", "No ar", "Escondidas", "Removidas"],
    head: ["Lugar", "Quem", "Nota", "Comentário", "Status", "Quando", "Denúncias", ""],
    row: (r) => `<td><div class="who">${esc(r.lugar)}</div><div class="sub">${esc(r.cidade || "")}</div></td>
      <td>${esc(r.apelido || "Anônimo")}</td>
      <td class="nowrap"><strong>${r.nota != null ? esc(Number(r.nota).toFixed(1)) : "—"}</strong>
        <div class="axes">${[["Atendimento", r.atendimento], ["Afeto", r.afeto], ["Banheiro", r.banheiro], ["Clientela", r.clientela]].filter(([, v]) => v != null).map(([k, v]) => `<span>${k} ${esc(v)}</span>`).join("")}</div></td>
      <td class="text">${r.comentario ? esc(r.comentario) : `<span class="dim">sem comentário</span>`}</td>`,
  },
  mensagens: {
    key: "mensagens", title: "Mensagens do mural", rpc: "admin_messages", type: "message", fem: true, search: "Buscar no texto ou apelido",
    lead: "O que as pessoas escreveram no mural de apoio.",
    tabs: ["Todas", "No ar", "Escondidas", "Removidas"],
    head: ["Quem", "Tipo", "Mensagem", "Cidade", "Curtidas", "Status", "Quando", "Denúncias", ""],
    row: (r) => `<td>${esc(r.apelido || "Anônimo")}</td>
      <td>${chip(r.categoria === "pedido_ajuda" ? "removed" : "", CAT_MURAL[r.categoria] || r.categoria)}</td>
      <td class="text">${esc(r.conteudo)}</td>
      <td>${esc(r.cidade || "—")}</td>
      <td class="r num">${num(r.curtidas)}</td>`,
  },
  relatos: {
    key: "relatos", title: "Relatos", rpc: "admin_occurrences", type: "occurrence", fem: false, search: null,
    lead: "Relatos de LGBTIfobia. <strong>Sem autor:</strong> a equipe modera o texto, nunca vê quem registrou.",
    tabs: ["Todos", "No ar", "Escondidos", "Removidos"],
    head: ["Tipo", "Descrição", "Onde", "Data do fato", "Status", "Registrado", "Denúncias", ""],
    row: (r) => `<td><div class="who">${esc(TIPO_RELATO[r.tipo] || r.tipo)}</div>${r.gravidade ? chip(r.gravidade, `Gravidade ${GRAVIDADE[r.gravidade] || r.gravidade}`) : ""}</td>
      <td class="text">${r.descricao ? esc(r.descricao) : `<span class="dim">sem descrição</span>`}</td>
      <td>${esc([r.bairro, r.cidade].filter(Boolean).join(" · ") || "—")}</td>
      <td class="nowrap">${esc(fmtDay(r.data))}</td>`,
  },
};
const modState = {};
const STATUS_TABS = [null, "active", "hidden", "removed"];

async function viewMod(ctx, cfg) {
  const st = (modState[cfg.key] ||= { status: null, busca: "", offset: 0 });
  ctx.el.innerHTML = headHTML(cfg.title, cfg.lead) + `
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Filtrar por status">${STATUS_TABS.map((s, i) => `<button type="button" data-tab="${i}" aria-pressed="${st.status === s}">${cfg.tabs[i]}</button>`).join("")}</div>
      ${cfg.search ? `<input class="input" type="search" id="mBusca" placeholder="${esc(cfg.search)}" aria-label="${esc(cfg.search)}" value="${esc(st.busca)}">` : ""}
    </div><div id="mbox"></div>`;
  const box = $("#mbox", ctx.el);
  let rows = [], total = 0;
  const draw = () => {
    box.innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr>${cfg.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cfg.row(r)}
        <td>${statusChip(r.status, cfg.fem)}</td>
        <td class="nowrap">${when(r.criado_em)}</td>
        <td class="r">${Number(r.denuncias) ? `<span class="chip removed">${num(r.denuncias)}</span>` : `<span class="dim">0</span>`}</td>
        <td><div class="actions" style="flex-wrap:nowrap">
          ${r.status !== "active" ? `<button class="btn sm ok" data-act="active" data-id="${esc(r.id)}">Voltar ao ar</button>` : ""}
          ${r.status === "active" ? `<button class="btn sm warn" data-act="hidden" data-id="${esc(r.id)}">Esconder</button>` : ""}
          ${r.status !== "removed" ? `<button class="btn sm danger" data-act="removed" data-id="${esc(r.id)}">Remover</button>` : ""}
        </div></td></tr>`).join("")}</tbody></table></div>${pagerHTML(total, st.offset)}`
      : `<div class="card empty">Nada por aqui${st.busca ? " com essa busca" : ""}.</div>`;
    bindPager(box, st, reload);
    $$("[data-act]", box).forEach((b) => b.addEventListener("click", async () => {
      const to = b.dataset.act;
      if (to === "removed") {
        const ok = await confirmBox({ title: "Remover?", text: "Sai do app e fecha as denúncias desse item. Fica guardado aqui em “Removid" + (cfg.fem ? "as" : "os") + "” e dá para voltar ao ar depois.", ok: "Remover", danger: true });
        if (!ok) return;
      }
      await busy(b, async () => {
        await rpc("admin_set_status", { p_type: cfg.type, p_id: b.dataset.id, p_status: to });
        const r = rows.find((x) => x.id === b.dataset.id);
        if (r) { r.status = to; r.denuncias = 0; }
        toast(to === "active" ? "De volta ao ar" : to === "hidden" ? (cfg.fem ? "Escondida" : "Escondido") : (cfg.fem ? "Removida" : "Removido"));
        draw();
        refreshBadges();
      });
    }));
  };
  const reload = () => load(box, async () => {
    const args = cfg.search
      ? { p_status: st.status, p_busca: st.busca || null, p_limite: PAGE, p_offset: st.offset }
      : { p_status: st.status, p_limite: PAGE, p_offset: st.offset };
    rows = (await rpc(cfg.rpc, args)) || [];
    if (!ctx.alive()) return;
    total = rows[0]?.total || 0;
    draw();
  }, ctx);
  $$("[data-tab]", ctx.el).forEach((b) => b.addEventListener("click", () => {
    st.status = STATUS_TABS[Number(b.dataset.tab)];
    st.offset = 0;
    $$("[data-tab]", ctx.el).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    reload();
  }));
  $("#mBusca", ctx.el)?.addEventListener("input", debounce((ev) => { st.busca = ev.target.value.trim(); st.offset = 0; reload(); }));
  await reload();
}

// ================================================================ 8. Denúncias
async function viewDenuncias(ctx) {
  ctx.el.innerHTML = headHTML("Denúncias", "O que as pessoas denunciaram e ainda ninguém decidiu. Quem denunciou não aparece.", `<button class="btn sm ghost" id="dReload">Atualizar</button>`) + `<div id="dbox"></div>`;
  const box = $("#dbox", ctx.el);
  let rows = [];
  const draw = () => {
    if (!rows.length) { box.innerHTML = `<div class="card empty">Nenhuma denúncia aberta.</div>`; return; }
    box.innerHTML = `<div class="cards">${rows.map((r, i) => {
      let summary = r.summary || "";
      let img = "";
      if (r.target_type === "photo") {
        const m = summary.match(/https?:\/\/\S+$/);
        if (m) { img = `<img class="thumb" src="${esc(m[0])}" alt="Foto denunciada" loading="lazy" referrerpolicy="no-referrer">`; summary = summary.slice(0, m.index).replace(/\s·\s*$/, ""); }
      }
      if (r.target_type === "occurrence") {
        const k = summary.split(" · ")[0];
        if (TIPO_RELATO[k]) summary = TIPO_RELATO[k] + summary.slice(k.length);
      }
      const motivos = {};
      (r.reasons || []).forEach((m) => { motivos[m] = (motivos[m] || 0) + 1; });
      return `<div class="card mod-card">
        <div class="top">${chip("", ALVO[r.target_type] || r.target_type)} ${statusChip(r.current_status)} <span class="chip removed">${plural(r.reports, "denúncia", "denúncias")}</span></div>
        ${img}
        <p class="summary">${summary ? esc(summary) : `<span class="dim">Item não encontrado (pode ter sido apagado).</span>`}</p>
        <div><div class="small dim">Motivos · primeira ${esc(rel(r.first_reported))}</div>
          <ul>${Object.entries(motivos).map(([m, n]) => `<li>${esc(m)}${n > 1 ? ` <span class="dim">(${n}×)</span>` : ""}</li>`).join("")}</ul></div>
        <div class="actions"><button class="btn sm danger" data-mod="remove" data-i="${i}">Tirar do ar</button><button class="btn sm ok" data-mod="restore" data-i="${i}">Manter no ar</button></div>
      </div>`;
    }).join("")}</div>`;
    $$("[data-mod]", box).forEach((b) => b.addEventListener("click", async () => {
      const r = rows[Number(b.dataset.i)];
      const remove = b.dataset.mod === "remove";
      if (remove) {
        const ok = await confirmBox({ title: "Tirar do ar?", text: `${ALVO[r.target_type] || "O item"} sai do app e as denúncias são aceitas.`, ok: "Tirar do ar", danger: true });
        if (!ok) return;
      }
      await busy(b, async () => {
        await rpc("moderate", { p_type: r.target_type, p_id: r.target_id, p_action: remove ? "remove" : "restore" });
        rows = rows.filter((x) => x !== r);
        toast(remove ? "Tirado do ar" : "Mantido no ar");
        draw();
        refreshBadges();
      });
    }));
  };
  const reload = () => load(box, async () => {
    rows = (await rpc("moderation_queue", { p_limit: 100 })) || [];
    if (!ctx.alive()) return;
    draw();
  }, ctx);
  $("#dReload", ctx.el).addEventListener("click", reload);
  await reload();
}

// ================================================================ 9. Fotos
async function viewFotos(ctx) {
  ctx.el.innerHTML = headHTML("Fotos na fila", "Fotos que as pessoas mandaram ao avaliar. Nenhuma entra no ar sozinha. Quem mandou não aparece aqui.", `<button class="btn sm ghost" id="fReload">Atualizar</button>`) + `<div id="fbox"></div>`;
  const box = $("#fbox", ctx.el);
  let rows = [];
  const draw = () => {
    if (!rows.length) { box.innerHTML = `<div class="card empty">Nenhuma foto esperando.</div>`; return; }
    box.innerHTML = `<div class="cards">${rows.map((p, i) => `<div class="card mod-card">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"><img class="thumb" src="${esc(p.url)}" alt="Foto enviada para ${esc(p.place_name || "um lugar")}" loading="lazy" referrerpolicy="no-referrer"></a>
        <div class="top"><strong>${esc(p.place_name || "Lugar sem nome")}</strong></div>
        <div class="top">${chip(p.review, FOTO_REVIEW[p.review] || p.review)} <span class="small dim">${esc(rel(p.created_at))}</span></div>
        ${p.review_note ? `<p class="small muted">${esc(p.review_note)}</p>` : ""}
        <div class="actions"><button class="btn sm ok" data-f="1" data-i="${i}">Aprovar</button><button class="btn sm danger" data-f="0" data-i="${i}">Recusar</button></div>
      </div>`).join("")}</div>`;
    $$("[data-f]", box).forEach((b) => b.addEventListener("click", async () => {
      const p = rows[Number(b.dataset.i)];
      const aprovar = b.dataset.f === "1";
      if (!aprovar) {
        const ok = await confirmBox({ title: "Recusar essa foto?", text: "Ela não vai para o app.", ok: "Recusar", danger: true });
        if (!ok) return;
      }
      await busy(b, async () => {
        await rpc("moderar_foto", { p_id: p.id, p_aprovar: aprovar });
        rows = rows.filter((x) => x !== p);
        toast(aprovar ? "Aprovada" : "Recusada");
        draw();
        refreshBadges();
      });
    }));
  };
  const reload = () => load(box, async () => {
    rows = ((await rpc("fotos_para_moderar", { p_limit: 100 })) || []);
    if (!ctx.alive()) return;
    draw();
  }, ctx);
  $("#fReload", ctx.el).addEventListener("click", reload);
  await reload();
}

// ================================================================ 10. Lugares
const lugaresState = { cidade: null, busca: "", status: null, offset: 0 };
async function viewLugares(ctx) {
  ctx.el.innerHTML = headHTML("Lugares", "Lugares do mapa. Corrija nome, categoria e ponto, esconda o que não é lugar e suba foto da equipe.", `<button class="btn ghost" id="lExport">Exportar CSV</button><button class="btn ghost" id="lImport">Importar descrições</button><input type="file" id="lImportFile" accept=".csv" hidden><button class="btn" id="lNovo">Novo lugar</button>`) + `
    <div class="toolbar">
      <div id="lCidade" style="flex:0 1 260px;min-width:200px"></div>
      <input class="input" type="search" id="lBusca" placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" value="${esc(lugaresState.busca)}">
      <label class="sr-only" for="lStatus">Status</label>
      <select class="input" id="lStatus"><option value="">Todos</option><option value="active">No ar</option><option value="hidden">Escondidos</option><option value="removed">Removidos</option></select>
    </div><div id="lbox"></div>`;
  $("#lStatus", ctx.el).value = lugaresState.status || "";
  const box = $("#lbox", ctx.el);
  let rows = [], total = 0;
  const reload = () => load(box, async () => {
    rows = (await rpc("admin_places", { p_cidade: lugaresState.cidade?.id ?? null, p_busca: lugaresState.busca || null, p_status: lugaresState.status, p_limite: PAGE, p_offset: lugaresState.offset })) || [];
    if (!ctx.alive()) return;
    total = rows[0]?.total || 0;
    box.innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Foto</th><th>Lugar</th><th>Cidade</th><th class="r">Avaliações</th><th>Nota</th><th>Status</th><th>Verificado</th><th class="r">Relevância</th><th>Entrou</th><th></th></tr></thead>
      <tbody>${rows.map((p, i) => `<tr class="click" tabindex="0" data-i="${i}">
        <td>${p.foto_url ? `<img class="thumb-sm" src="${esc(p.foto_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="thumb-sm" aria-hidden="true"></span>`}</td>
        <td><div class="who">${esc(p.nome)}</div><div class="sub">${esc([CATEGORIA[p.categoria] || p.categoria, p.bairro].filter(Boolean).join(" · "))}</div></td>
        <td class="nowrap">${esc(p.cidade || "—")}</td>
        <td class="r num">${num(p.avaliacoes)}</td>
        <td class="nowrap">${p.nota != null && Number(p.avaliacoes) ? `<strong>${esc(Number(p.nota).toFixed(1))}</strong>` : `<span class="dim">—</span>`}${p.selo ? `<div class="sub">${esc(SELO[p.selo] || p.selo)}</div>` : ""}</td>
        <td>${statusChip(p.status, false)}</td>
        <td>${p.verificado ? chip("on", "sim") : `<span class="dim">não</span>`}</td>
        <td class="r num">${p.relevancia == null ? "—" : num(p.relevancia)}</td>
        <td class="nowrap">${esc(fmtD(p.criado_em))}</td>
        <td><button class="btn sm ghost" data-edit="${i}">Editar</button></td></tr>`).join("")}</tbody></table></div>${pagerHTML(total, lugaresState.offset)}`
      : `<div class="card empty">Nenhum lugar com esses filtros.</div>`;
    $$("tr[data-i]", box).forEach((tr) => {
      const open = () => placeEditor(rows[Number(tr.dataset.i)], reload);
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", (ev) => { if (ev.key === "Enter") open(); });
    });
    bindPager(box, lugaresState, reload);
  }, ctx);
  cityCombo($("#lCidade", ctx.el), { value: lugaresState.cidade, placeholder: "Filtrar por cidade", onChange: (v) => { lugaresState.cidade = v; lugaresState.offset = 0; reload(); } });
  $("#lBusca", ctx.el).addEventListener("input", debounce((ev) => { lugaresState.busca = ev.target.value.trim(); lugaresState.offset = 0; reload(); }));
  $("#lStatus", ctx.el).addEventListener("change", (ev) => { lugaresState.status = ev.target.value || null; lugaresState.offset = 0; reload(); });
  $("#lNovo", ctx.el).addEventListener("click", () => placeEditor(null, reload));
  $("#lExport", ctx.el).addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
    const todos = (await rpc("admin_places_export", { p_cidade: lugaresState.cidade?.id ?? null, p_busca: lugaresState.busca || null, p_status: lugaresState.status })) || [];
    if (!todos.length) { toast("Nenhum lugar com esses filtros."); return; }
    baixarCSV(`lugares-irisa-${new Date().toISOString().slice(0, 10)}.csv`, [
      { titulo: "Nome", valor: (p) => p.nome },
      { titulo: "Categoria", valor: (p) => CATEGORIA[p.categoria] || p.categoria },
      { titulo: "Endereço", valor: (p) => p.endereco },
      { titulo: "Cidade", valor: (p) => p.cidade },
      { titulo: "Bairro", valor: (p) => p.bairro },
      { titulo: "Latitude", valor: (p) => p.lat },
      { titulo: "Longitude", valor: (p) => p.lng },
      { titulo: "Status", valor: (p) => p.status },
      { titulo: "Verificado", valor: (p) => (p.verificado ? "sim" : "não") },
      { titulo: "Avaliações", valor: (p) => p.avaliacoes },
      { titulo: "Nota", valor: (p) => p.nota },
      { titulo: "Selo", valor: (p) => SELO[p.selo] || p.selo },
      { titulo: "Entrou em", valor: (p) => fmtD(p.criado_em) },
    ], todos);
    toast(`${todos.length} lugares exportados.`);
  }));
  $("#lImport", ctx.el).addEventListener("click", () => $("#lImportFile", ctx.el).click());
  $("#lImportFile", ctx.el).addEventListener("change", (ev) => {
    const file = ev.currentTarget.files[0];
    ev.currentTarget.value = "";
    if (!file) return;
    busy($("#lImport", ctx.el), async () => {
      const texto = await file.text();
      const linhas = lerCSV(texto);
      const itens = linhas
        .map((l) => ({ lat: parseFloat(l.lat ?? l.Latitude), lng: parseFloat(l.lng ?? l.Longitude), descricao: l.descricao ?? l.Descrição ?? l.Descricao }))
        .filter((l) => isFinite(l.lat) && isFinite(l.lng) && l.descricao);
      if (!itens.length) throw new Error('CSV sem colunas "lat", "lng" e "descricao" reconhecíveis.');
      const n = await rpc("admin_import_place_descriptions", { p_items: itens });
      toast(`${n} de ${itens.length} linhas encontraram o lugar e entraram (lugar sem description vazia e a até ~10 m do ponto do CSV).`);
      reload();
    });
  });
  await reload();
}

function placeEditor(p, reload) {
  const novo = !p;
  p = p ? { ...p } : { id: null, nome: "", categoria: "bar", endereco: "", lat: "", lng: "", status: "active", verificado: false };
  let mudou = false;
  const d = openDialog(`
    <h2>${novo ? "Novo lugar" : "Editar lugar"}</h2>
    ${novo ? `<div class="note info"><span>A cidade e o bairro saem do ponto (latitude e longitude), não do endereço. O banco recusa nome muito parecido com outro lugar a menos de 150 m.</span></div>` : ""}
    <form class="form" id="pf" novalidate>
      <label class="f">Nome <input class="input" name="nome" required maxlength="120" value="${esc(p.nome)}"></label>
      <div class="row">
        <label class="f">Categoria <select class="input" name="categoria">${Object.entries(CATEGORIA).map(([k, v]) => `<option value="${k}" ${k === p.categoria ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Status <select class="input" name="status"><option value="active">No ar</option><option value="hidden">Escondido</option><option value="removed">Removido</option></select></label>
      </div>
      <label class="f">Endereço <span class="hint">texto que aparece na ficha</span><input class="input" name="endereco" maxlength="200" value="${esc(p.endereco || "")}"></label>
      <div class="row">
        <label class="f">Latitude <input class="input" name="lat" inputmode="decimal" required value="${esc(p.lat ?? "")}" placeholder="-25.4284"></label>
        <label class="f">Longitude <input class="input" name="lng" inputmode="decimal" required value="${esc(p.lng ?? "")}" placeholder="-49.2733"></label>
      </div>
      <a id="osm" target="_blank" rel="noopener noreferrer">Abrir no mapa</a>
      <label class="check"><input type="checkbox" name="verificado" ${p.verificado ? "checked" : ""}> Verificado pela equipe</label>
      ${novo ? "" : `<p class="small dim">${esc(p.cidade || "")}${p.bairro ? " · " + esc(p.bairro) : ""} · ${plural(p.avaliacoes || 0, "avaliação", "avaliações")}</p>`}
      <div id="photoArea"></div>
      <div class="foot"><button type="button" class="btn ghost" data-close>Fechar</button><button class="btn" type="submit" id="pfSave">Salvar</button></div>
    </form>`, { wide: true, onClose: () => { if (mudou) reload(); } });
  const f = $("#pf", d);
  f.status.value = p.status || "active";
  const osm = () => {
    const lat = parseFloat(String(f.lat.value).replace(",", ".")), lng = parseFloat(String(f.lng.value).replace(",", "."));
    const a = $("#osm", d);
    const ok = isFinite(lat) && isFinite(lng);
    a.hidden = !ok;
    if (ok) a.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
  };
  f.lat.addEventListener("input", osm);
  f.lng.addEventListener("input", osm);
  osm();

  const drawPhoto = () => {
    const area = $("#photoArea", d);
    if (!p.id) { area.innerHTML = `<p class="small dim">Depois de salvar dá para subir a foto.</p>`; return; }
    area.innerHTML = `<div class="photo-box">
      ${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="Foto atual" referrerpolicy="no-referrer">` : `<div class="ph">Sem foto</div>`}
      <div class="form">
        <div class="small muted">${p.foto_url ? `Foto ${esc(FOTO_ORIGEM[p.foto_origem] || p.foto_origem || "")}` : "Sem foto: o app mostra o ícone da categoria."}</div>
        <label class="f">Subir foto <span class="hint">JPEG, PNG ou WebP, até 5 MB. Só foto própria ou com licença.</span><input class="input" type="file" id="pFile" accept="image/jpeg,image/png,image/webp"></label>
        <label class="f">Crédito <input class="input" id="pCred" value="Equipe Irisa" maxlength="80"></label>
        <div class="actions"><button type="button" class="btn sm" id="pUp">Enviar foto</button>${p.foto_origem === "equipe" ? `<button type="button" class="btn sm ghost" id="pDel">Tirar foto da equipe</button>` : ""}</div>
      </div></div>`;
    $("#pUp", d).addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
      const file = $("#pFile", d).files[0];
      if (!file) throw new Error("Escolha uma imagem primeiro.");
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("A imagem precisa ser JPEG, PNG ou WebP.");
      if (file.size > 5 * 1024 * 1024) throw new Error("A imagem passa de 5 MB.");
      const blob = await resizeImage(file);
      const path = `equipe/${p.id}/${Date.now()}.jpg`;
      const up = await sb.storage.from("fotos-lugares").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error(ptErr(up.error));
      const { data } = sb.storage.from("fotos-lugares").getPublicUrl(path);
      await rpc("admin_place_photo", { p_id: p.id, p_url: data.publicUrl, p_credito: $("#pCred", d).value.trim() || "Equipe Irisa" });
      p.foto_url = data.publicUrl; p.foto_origem = "equipe"; mudou = true;
      toast("Foto salva");
      drawPhoto();
    }));
    $("#pDel", d)?.addEventListener("click", async (ev) => {
      const btn = ev.currentTarget;
      const ok = await confirmBox({ title: "Tirar a foto da equipe?", text: "O lugar fica sem foto até o robô de fotos achar outra.", ok: "Tirar foto", danger: true });
      if (!ok) return;
      await busy(btn, async () => {
        await rpc("admin_place_photo", { p_id: p.id, p_url: null, p_credito: null });
        p.foto_url = null; p.foto_origem = null; mudou = true;
        toast("Foto tirada");
        drawPhoto();
      });
    });
  };
  drawPhoto();

  f.addEventListener("submit", (ev) => {
    ev.preventDefault();
    busy($("#pfSave", d), async () => {
      const nome = f.nome.value.trim();
      const lat = parseFloat(String(f.lat.value).replace(",", ".")), lng = parseFloat(String(f.lng.value).replace(",", "."));
      if (!nome) throw new Error("Escreva o nome do lugar.");
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Latitude e longitude precisam ser números (ex.: -25.4284 e -49.2733).");
      if (lat > 6 || lat < -34 || lng > -28 || lng < -74) {
        const ok = await confirmBox({ title: "Esse ponto fica fora do Brasil", text: "Confira se latitude e longitude não estão trocadas. Salvar mesmo assim?", ok: "Salvar assim" });
        if (!ok) return;
      }
      const id = await rpc("admin_place_save", {
        p_id: p.id, p_nome: nome, p_categoria: f.categoria.value, p_endereco: f.endereco.value.trim() || null,
        p_lat: lat, p_lng: lng, p_status: f.status.value, p_verificado: f.verificado.checked,
      });
      mudou = true;
      toast("Salvo");
      if (!p.id) {
        p.id = id;
        $("h2", d).textContent = "Editar lugar";
        drawPhoto();
      } else d.close();
    });
  });
}

// Reduz para no máximo 1600 px de largura, JPEG 0,85. Fundo branco para PNG com transparência.
async function resizeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Não deu para abrir essa imagem.")); i.src = url; });
    const scale = Math.min(1, 1600 / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.85));
    if (!blob) throw new Error("Não deu para preparar a imagem.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ================================================================ 11. Serviços de apoio
async function viewServicos(ctx) {
  ctx.el.innerHTML = headHTML("Serviços de apoio", "Telefones e endereços que aparecem no app, nacionais e por cidade.", `<button class="btn" id="sNovo">Novo serviço</button>`) + `
    <div class="note"><span><strong>Telefone errado em app de segurança é pior que telefone ausente:</strong> confira ligando antes de publicar.</span></div><div id="sbox"></div>`;
  const box = $("#sbox", ctx.el);
  const reload = () => load(box, async () => {
    const rows = (await rpc("admin_services")) || [];
    if (!ctx.alive()) return;
    const grupos = new Map();
    for (const s of rows) {
      const g = s.cidade_id ? `${s.cidade} · ${s.uf || ""}` : s.uf ? `Estado: ${s.uf}` : "Nacional";
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(s);
    }
    const ordem = [...grupos.keys()].sort((a, b) => (a === "Nacional" ? -1 : b === "Nacional" ? 1 : a.startsWith("Estado") === b.startsWith("Estado") ? a.localeCompare(b, "pt-BR") : a.startsWith("Estado") ? -1 : 1));
    box.innerHTML = rows.length ? ordem.map((g) => `<div class="card"><div class="card-head" style="margin-bottom:0"><h2>${esc(g)}</h2><span class="small dim">${plural(grupos.get(g).length, "serviço", "serviços")}</span></div>
      ${grupos.get(g).map((s) => `<div class="svc"><div class="txt">
          <div><strong>${esc(s.nome)}</strong> ${chip("", TIPO_SERVICO[s.tipo] || s.tipo)} ${s.ativo ? "" : chip("off", "Fora do app")}</div>
          ${s.telefone ? `<div class="tel"><a href="tel:${esc(s.telefone.replace(/[^\d+]/g, ""))}">${esc(s.telefone)}</a></div>` : ""}
          ${s.url ? `<div class="small"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a></div>` : ""}
          ${s.descricao ? `<p class="small muted">${esc(s.descricao)}</p>` : ""}
        </div><button class="btn sm ghost" data-sid="${esc(s.id)}">Editar</button></div>`).join("")}</div>`).join("")
      : `<div class="card empty">Nenhum serviço cadastrado.</div>`;
    $$("[data-sid]", box).forEach((b) => b.addEventListener("click", () => serviceEditor(rows.find((s) => String(s.id) === b.dataset.sid), reload)));
  }, ctx);
  $("#sNovo", ctx.el).addEventListener("click", () => serviceEditor(null, reload));
  await reload();
}

function serviceEditor(s, reload) {
  const novo = !s;
  s = s || { id: null, nome: "", tipo: "acolhimento", telefone: "", url: "", descricao: "", cidade_id: null, cidade: "", uf: "", ativo: true };
  let escopo = s.cidade_id ? "cidade" : s.uf ? "estado" : "nacional";
  let cidade = s.cidade_id ? { id: s.cidade_id, name: s.cidade, state: s.uf } : null;
  const d = openDialog(`
    <h2>${novo ? "Novo serviço" : "Editar serviço"}</h2>
    <div class="note"><span>Confira o telefone ligando antes de publicar.</span></div>
    <form class="form" id="sf" novalidate>
      <label class="f">Nome <input class="input" name="nome" required maxlength="120" value="${esc(s.nome)}"></label>
      <div class="row">
        <label class="f">Tipo <select class="input" name="tipo">${Object.entries(TIPO_SERVICO).map(([k, v]) => `<option value="${k}" ${k === s.tipo ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Telefone <input class="input" name="telefone" inputmode="tel" maxlength="40" value="${esc(s.telefone || "")}" placeholder="0800 000 0000"></label>
      </div>
      <label class="f">Site <input class="input" name="url" type="url" maxlength="300" value="${esc(s.url || "")}" placeholder="https://"></label>
      <label class="f">Descrição <textarea class="input" name="descricao" rows="3" maxlength="400">${esc(s.descricao || "")}</textarea></label>
      <div class="f"><span style="font-weight:500;font-size:13px;color:var(--muted)">Onde aparece</span>
        <div class="seg" role="group" aria-label="Onde aparece"><button type="button" data-esc="nacional">Brasil todo</button><button type="button" data-esc="estado">Um estado</button><button type="button" data-esc="cidade">Uma cidade</button></div></div>
      <label class="f" id="ufWrap">Estado <select class="input" name="uf">${UFS.map((u) => `<option ${u === (s.uf || "").trim() ? "selected" : ""}>${u}</option>`).join("")}</select></label>
      <div class="f" id="cidWrap"><span style="font-weight:500;font-size:13px;color:var(--muted)">Cidade</span><div id="sCidade"></div></div>
      <label class="check"><input type="checkbox" name="ativo" ${s.ativo ? "checked" : ""}> Aparece no app</label>
      <div class="foot"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn" type="submit" id="sfSave">Salvar</button></div>
    </form>`, { wide: true });
  const f = $("#sf", d);
  cityCombo($("#sCidade", d), { value: cidade, onChange: (v) => { cidade = v; } });
  const drawEsc = () => {
    $$("[data-esc]", d).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.esc === escopo)));
    $("#ufWrap", d).hidden = escopo !== "estado";
    $("#cidWrap", d).hidden = escopo !== "cidade";
  };
  $$("[data-esc]", d).forEach((b) => b.addEventListener("click", () => { escopo = b.dataset.esc; drawEsc(); }));
  drawEsc();
  f.addEventListener("submit", (ev) => {
    ev.preventDefault();
    busy($("#sfSave", d), async () => {
      const nome = f.nome.value.trim();
      if (!nome) throw new Error("Escreva o nome do serviço.");
      if (escopo === "cidade" && !cidade) throw new Error("Escolha a cidade.");
      const url = f.url.value.trim();
      if (url && !/^https?:\/\//i.test(url)) throw new Error("O site precisa começar com https://");
      await rpc("admin_service_save", {
        p_id: s.id, p_nome: nome, p_tipo: f.tipo.value, p_telefone: f.telefone.value.trim() || null, p_url: url || null,
        p_descricao: f.descricao.value.trim() || null,
        p_cidade: escopo === "cidade" ? cidade.id : null,
        p_uf: escopo === "cidade" ? cidade.state : escopo === "estado" ? f.uf.value : null,
        p_ativo: f.ativo.checked,
      });
      toast("Salvo");
      d.close();
      reload();
    });
  });
}

// ================================================================ 12. Configurações
async function viewConfig(ctx) {
  ctx.el.innerHTML = headHTML("Configurações", "Ajustes que mudam o app na hora, sem versão nova.") + `<div id="cbox"></div>`;
  const box = $("#cbox", ctx.el);
  await load(box, async () => {
    const [cfg0, pub] = await Promise.all([rpc("admin_settings"), rpc("app_config").catch(() => null)]);
    const cfg = cfg0 || {};
    if (!ctx.alive()) return;
    const pq = { ativa: false, id: "", texto: "", ...(cfg.pergunta_semana || {}) };
    const pqN = Number(pub?.pergunta_respostas ?? 0);
    const av = { ativo: false, titulo: "", texto: "", url: null, ...(cfg.aviso || {}) };
    const abre = typeof cfg.abre_alas_ate === "string" ? cfg.abre_alas_ate.slice(0, 10) : "";
    box.innerHTML = `
      <div class="grid2">
        <form class="card form" id="avForm" novalidate>
          <h2>Aviso no Início do app</h2>
          <p class="small muted">Um cartão no topo do Início, para todo mundo. Para avisos curtos: cidade nova, manutenção, evento.</p>
          <label class="check"><input type="checkbox" id="avAtivo" ${av.ativo ? "checked" : ""}> Mostrar o aviso no app</label>
          <label class="f">Título <input class="input" id="avTitulo" maxlength="60" value="${esc(av.titulo)}"></label>
          <span class="counter" id="cAvT"></span>
          <label class="f">Texto <textarea class="input" id="avTexto" maxlength="200" rows="3">${esc(av.texto)}</textarea></label>
          <span class="counter" id="cAvX"></span>
          <label class="f">Tela que abre ao tocar <select class="input" id="avUrl">${telaOptions(av.url)}</select></label>
          <div><button class="btn" type="submit" id="avSave">Salvar aviso</button></div>
        </form>
        <div class="card"><h2>Como aparece</h2><p class="small muted" style="margin:4px 0 14px" id="avEstado"></p><div class="aviso-prev" id="avPrev"><div class="tt"></div><div class="bd muted"></div><div class="go"></div></div></div>
      </div>
      <div class="grid2" style="margin-top:14px">
        <form class="card form" id="pqForm" novalidate>
          <h2>Pergunta da semana</h2>
          <p class="small muted">Aparece no topo do mural de apoio. O app mostra só quantas pessoas responderam, nunca quem. Trocar o texto começa uma pergunta nova e zera a contagem.</p>
          <label class="check"><input type="checkbox" id="pqAtiva" ${pq.ativa ? "checked" : ""}> Mostrar a pergunta no app</label>
          <label class="f">Pergunta <textarea class="input" id="pqTexto" maxlength="120" rows="2">${esc(pq.texto)}</textarea></label>
          <span class="counter" id="cPq"></span>
          <div><button class="btn" type="submit" id="pqSave">Salvar pergunta</button></div>
          <p class="small dim" id="pqId"></p>
        </form>
        <div class="card"><h2>Como aparece</h2><p class="small muted" style="margin:4px 0 14px" id="pqEstado"></p>
          <div class="q-prev" id="pqPrev"><div class="eb">Pergunta da semana</div><div class="q"></div><div class="n"></div></div></div>
      </div>
      <form class="card form" id="aaForm" novalidate>
        <h2>Abre-Alas</h2>
        <p class="small muted">Quem criou a conta até esta data ganha a medalha Abre-Alas. Vazio: ainda em teste, todo mundo que entra ganha.</p>
        <div class="row"><label class="f" style="flex:0 1 220px">Contas criadas até <input class="input" type="date" id="aaData" value="${esc(abre)}"></label>
          <button class="btn" type="submit" id="aaSave">Salvar data</button>
          <button class="btn ghost" type="button" id="aaLimpar">Deixar vazio</button></div>
        <p class="small" id="aaEstado"></p>
      </form>`;
    const t = $("#avTitulo", box), x = $("#avTexto", box), u = $("#avUrl", box), at = $("#avAtivo", box);
    counter(t, $("#cAvT", box), 60);
    counter(x, $("#cAvX", box), 200);
    const prev = () => {
      const pv = $("#avPrev", box);
      $(".tt", pv).textContent = t.value.trim() || "Título do aviso";
      $(".bd", pv).textContent = x.value.trim() || "O texto do aviso aparece aqui.";
      $(".go", pv).textContent = u.value ? `Abrir ${telaNome(u.value)} →` : "";
      pv.style.opacity = at.checked ? "1" : ".5";
      $("#avEstado", box).textContent = at.checked ? "Ligado: aparece para todo mundo depois de salvar." : "Desligado: ninguém vê.";
    };
    [t, x, u, at].forEach((el) => el.addEventListener("input", prev));
    at.addEventListener("change", prev);
    prev();
    $("#avForm", box).addEventListener("submit", (ev) => {
      ev.preventDefault();
      busy($("#avSave", box), async () => {
        if (at.checked && (!t.value.trim() || !x.value.trim())) throw new Error("Para ligar o aviso, escreva o título e o texto.");
        await rpc("admin_setting_set", { p_key: "aviso", p_value: { ativo: at.checked, titulo: t.value.trim(), texto: x.value.trim(), url: u.value || null } });
        toast("Salvo");
      });
    });
    // Pergunta da semana: o id muda quando o texto muda (o recado guarda o id em support_messages.prompt).
    const pt = $("#pqTexto", box), pa = $("#pqAtiva", box);
    let pqSalva = { ...pq };
    let pqNAtual = pqN;
    counter(pt, $("#cPq", box), 120);
    const novoId = () => {
      const d = todaySP();
      if (!pqSalva.id || !String(pqSalva.id).startsWith(d)) return d;
      const m = String(pqSalva.id).slice(d.length).match(/^-([a-z])$/);
      return `${d}-${String.fromCharCode((m ? m[1].charCodeAt(0) : 96) + 1)}`;
    };
    const mudouTexto = () => pt.value.trim() !== String(pqSalva.texto || "").trim();
    const pqPrev = () => {
      const pv = $("#pqPrev", box);
      $(".q", pv).textContent = pt.value.trim() || "Escreva a pergunta";
      const n = mudouTexto() ? 0 : pqNAtual;
      $(".n", pv).innerHTML = `<b>${num(n)}</b> ${n === 1 ? "pessoa respondeu" : "pessoas responderam"}`;
      pv.style.opacity = pa.checked ? "1" : ".5";
      $("#pqEstado", box).textContent = pa.checked ? "Ligada: aparece no mural depois de salvar." : "Desligada: o cartão some do mural.";
      $("#pqId", box).textContent = mudouTexto()
        ? `Pergunta nova ao salvar (id ${novoId()}). As respostas da anterior continuam no mural.`
        : pqSalva.id ? `Id da pergunta: ${pqSalva.id}` : "";
    };
    pt.addEventListener("input", pqPrev);
    pa.addEventListener("change", pqPrev);
    pqPrev();
    $("#pqForm", box).addEventListener("submit", (ev) => {
      ev.preventDefault();
      busy($("#pqSave", box), async () => {
        const texto = pt.value.trim();
        if (pa.checked && !texto) throw new Error("Para ligar a pergunta, escreva o texto.");
        const id = mudouTexto() || !pqSalva.id ? novoId() : pqSalva.id;
        const valor = { ativa: pa.checked, id, texto };
        await rpc("admin_setting_set", { p_key: "pergunta_semana", p_value: valor });
        if (id !== pqSalva.id) pqNAtual = 0;
        pqSalva = valor;
        pqPrev();
        toast("Salvo");
      });
    });
    const aaEstado = () => {
      const v = $("#aaData", box).value;
      $("#aaEstado", box).textContent = v ? `Ganha quem criou a conta até ${fmtDay(v)}.` : "Vazio: todo mundo que entra ganha o Abre-Alas.";
    };
    $("#aaData", box).addEventListener("input", aaEstado);
    aaEstado();
    const saveAbre = (btn, v) => busy(btn, async () => {
      await rpc("admin_setting_set", { p_key: "abre_alas_ate", p_value: v || null });
      toast("Salvo");
    });
    $("#aaForm", box).addEventListener("submit", (ev) => { ev.preventDefault(); saveAbre($("#aaSave", box), $("#aaData", box).value); });
    $("#aaLimpar", box).addEventListener("click", async (ev) => {
      const ok = await confirmBox({ title: "Deixar o Abre-Alas sem data?", text: "Todo mundo que criar conta a partir de agora também ganha a medalha.", ok: "Deixar vazio" });
      if (!ok) return;
      $("#aaData", box).value = "";
      aaEstado();
      saveAbre(ev.currentTarget, null);
    });
  }, ctx);
}

// ================================================================ 13. Chaves de API
const API_KEYS = [
  { name: "GROQ_API_KEY", label: "Groq", hint: "Conversa e decisão da Irise. console.groq.com → API Keys (grátis)." },
  { name: "GEMINI_API_KEY", label: "Gemini", hint: "Ranqueia e explica os lugares achados. aistudio.google.com (grátis)." },
];

async function viewChaves(ctx) {
  ctx.el.innerHTML = headHTML("Chaves de API", "Cole aqui em vez de mexer no painel do Supabase. A chave fica criptografada — nem o painel consegue mostrar de volta, só sobrescrever.") + `<div id="kbox"></div>`;
  const box = $("#kbox", ctx.el);
  await load(box, async () => {
    const [status, settings] = await Promise.all([rpc("admin_api_keys_status"), rpc("admin_settings")]);
    if (!ctx.alive()) return;
    const cfg = Object.fromEntries((status || []).map((s) => [s.name, s.configurado]));
    const iriseAtiva = !!(settings || {}).irise_ativa;
    const vozExtra = typeof (settings || {}).irise_voz_extra === "string" ? (settings || {}).irise_voz_extra : "";
    box.innerHTML = `
      <form class="card form" id="iriseForm" style="margin-bottom:14px">
        <h2>Botão da Irise no app</h2>
        <p class="small muted">Enquanto desligado, o botão não aparece pra ninguém — o código já está publicado, só escondido. Ligue depois de colar as chaves e testar com calma.</p>
        <label class="check"><input type="checkbox" id="iriseAtiva" ${iriseAtiva ? "checked" : ""}> Mostrar o botão da Irise no app</label>
      </form>
      <form class="card form" id="vozForm" style="margin-bottom:14px">
        <h2>Voz da Irise</h2>
        <p class="small muted">Texto extra de tom/personalidade, colado depois das regras fixas (nunca inventar lugar, nunca dizer "seguro" etc. continuam protegidas no código). Salva na hora, sem precisar publicar nada no Supabase.</p>
        <textarea class="input" id="vozExtra" rows="4" placeholder="Ex.: usa mais gíria tal, evita tal expressão…">${esc(vozExtra)}</textarea>
        <div class="foot"><button class="btn" type="submit">Salvar voz</button></div>
      </form>` + API_KEYS.map((k) => `
      <form class="card form" data-key="${k.name}" style="margin-bottom:14px">
        <h2>${esc(k.label)} <span class="small ${cfg[k.name] ? "ok" : "dim"}">${cfg[k.name] ? "· configurada" : "· não configurada"}</span></h2>
        <p class="small muted">${esc(k.hint)}</p>
        <div class="row">
          <input class="input" type="password" autocomplete="off" placeholder="Colar a chave aqui" style="flex:1">
          <button class="btn" type="submit">Salvar</button>
        </div>
      </form>`).join("");
    $("#iriseAtiva", box).addEventListener("change", async (ev) => {
      const input = ev.currentTarget;
      input.disabled = true;
      try {
        await rpc("admin_setting_set", { p_key: "irise_ativa", p_value: input.checked });
        toast("Salvo");
      } catch (e) {
        input.checked = !input.checked;
        toast(ptErr(e), true);
      } finally {
        input.disabled = false;
      }
    });
    $("#vozForm", box).addEventListener("submit", (ev) => {
      ev.preventDefault();
      busy($("button", ev.currentTarget), async () => {
        await rpc("admin_setting_set", { p_key: "irise_voz_extra", p_value: $("#vozExtra", box).value.trim() });
        toast("Salvo");
      });
    });
    $$("form[data-key]", box).forEach((form) => {
      const name = form.dataset.key;
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const input = $("input", form);
        const btn = $("button", form);
        busy(btn, async () => {
          await rpc("admin_set_api_key", { p_name: name, p_value: input.value });
          input.value = "";
          $("h2 .small", form).textContent = "· configurada";
          $("h2 .small", form).className = "small ok";
          toast("Salvo");
        });
      });
    });
  }, ctx);
}

// ================================================================ entrada, login e papel
function gateHTML(inner) {
  return `<div class="gate"><div class="card"><span class="wordmark">IRIS<b>A</b></span><div class="rule"></div>${inner}</div></div>`;
}

function showFatal(msg) {
  app.innerHTML = gateHTML(`<h1>Painel fora do ar</h1><p class="lead">${esc(msg)}</p>`);
}

// O login da Apple pelo navegador precisa do Services ID e da Secret Key no provider Apple da Supabase.
// Sem isso a Supabase responde "Unsupported provider: missing OAuth secret". Ligar quando estiver configurado.
const APPLE_WEB = false;

function showLogin(errMsg = "") {
  app.innerHTML = gateHTML(`
    <h1>Painel da equipe</h1><p class="lead">Entre com a sua conta da Irisa.</p>
    <div class="error" role="alert" id="loginErr" style="margin-bottom:12px" ${errMsg ? "" : "hidden"}><span>${esc(errMsg)}</span></div>
    <button class="btn google block" id="gBtn" type="button">Entrar com Google</button>
    ${APPLE_WEB ? `<button class="btn apple block" id="aBtn" type="button" style="margin-top:10px"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>Entrar com Apple</button>` : ""}
    <div class="or">ou</div>
    <form id="loginForm" novalidate>
      <label class="f">E-mail <input class="input" type="email" name="email" autocomplete="username" required></label>
      <label class="f">Senha <input class="input" type="password" name="senha" autocomplete="current-password" required></label>
      <button class="btn block" type="submit" id="lBtn">Entrar</button>
      <button class="btn ghost block" type="button" id="mBtn" style="margin-top:8px">Sem senha? Receber link por e-mail</button>
      <p class="small dim" id="mMsg" hidden style="text-align:center;margin-top:10px"></p>
    </form>`);
  $("#gBtn").addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }));
  $("#aBtn")?.addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }));
  // Link de entrada por e-mail: serve para conta criada pelo app com Apple (ou Google) que não tem senha.
  // shouldCreateUser: false, para o painel nunca criar conta nova.
  $("#mBtn").addEventListener("click", (ev) => {
    const f = $("#loginForm"), errBox = $("#loginErr"), msg = $("#mMsg");
    errBox.hidden = true; msg.hidden = true;
    busy(ev.currentTarget, async () => {
      const email = f.email.value.trim();
      if (!email) { errBox.hidden = false; errBox.innerHTML = "<span>Escreva o e-mail da conta.</span>"; return; }
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
      if (error) {
        const m = /Signups not allowed|not found|User not found/i.test(error.message) ? "Esse e-mail não tem conta na Irisa." : ptErr(error);
        errBox.hidden = false; errBox.innerHTML = `<span>${esc(m)}</span>`; return;
      }
      msg.hidden = false;
      msg.textContent = `Link enviado para ${email}. Abra o e-mail neste mesmo navegador e toque no link.`;
    });
  });
  $("#loginForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.currentTarget;
    const errBox = $("#loginErr");
    const fail = (msg) => { errBox.hidden = false; errBox.innerHTML = `<span>${esc(msg)}</span>`; };
    errBox.hidden = true;
    busy($("#lBtn"), async () => {
      const email = f.email.value.trim(), senha = f.senha.value;
      if (!email || !senha) { fail("Preencha e-mail e senha."); return; }
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) fail(ptErr(error));
      // deu certo: onAuthStateChange cuida do resto
    });
  });
}

async function enter(session) {
  me.email = session.user.email || "";
  me.id = session.user.id;
  app.innerHTML = `<div class="boot"><span class="wordmark">IRIS<b>A</b></span><p>Conferindo o acesso…</p></div>`;
  let role = "";
  try {
    role = await rpc("my_role");
  } catch (e) {
    app.innerHTML = gateHTML(`<h1>Não deu para conferir o acesso</h1><p class="lead">${esc(ptErr(e))}</p>
      <div class="actions" style="justify-content:center"><button class="btn" id="again">Tentar de novo</button><button class="btn ghost" id="out">Sair</button></div>`);
    $("#again").addEventListener("click", () => enter(session));
    $("#out").addEventListener("click", logout);
    return;
  }
  me.role = role;
  if (role !== "admin" && role !== "moderator") {
    app.innerHTML = gateHTML(`<h1>Sem acesso</h1><p class="lead">Esta conta não tem acesso ao painel.</p><p class="small dim" style="text-align:center;margin-bottom:14px">${esc(me.email)}</p>
      <button class="btn block" id="out">Sair</button>`);
    $("#out").addEventListener("click", logout);
    return;
  }
  app.innerHTML = shellHTML();
  $("#logout").addEventListener("click", logout);
  $("#menuBtn").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("#menuBtn").setAttribute("aria-expanded", String(open));
  });
  refreshBadges();
  route();
}

async function logout() {
  try { await sb.auth.signOut(); } catch { /* sai mesmo assim */ }
  me.role = ""; me.email = "";
  location.hash = "";
  showLogin();
}

async function boot() {
  if (SB_KEY.indexOf("__SUPABASE_") === 0) { showFatal("A chave do Supabase não entrou no build do site. Confira a variável SUPABASE_PUBLISHABLE_KEY em Settings → Secrets and variables → Actions → Variables e rode o build de novo."); return; }
  if (!window.supabase || !window.supabase.createClient) { showFatal("Não deu para carregar a biblioteca do Supabase. Confira a internet e recarregue a página."); return; }
  // Erro devolvido pelo login com Google (vem na URL).
  const qs = new URLSearchParams(location.search + "&" + location.hash.replace(/^#/, ""));
  const oauthErr = qs.get("error_description");
  if (oauthErr) history.replaceState(null, "", location.pathname);

  sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const { data } = await sb.auth.getSession();
  let current = data?.session?.user?.id || null;
  if (data?.session) enter(data.session);
  else showLogin(oauthErr ? `O login não terminou: ${oauthErr}` : "");

  // Nada de chamada ao Supabase dentro do callback (trava o cliente): adia para fora dele.
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "SIGNED_IN" && session && session.user.id !== current) { current = session.user.id; enter(session); }
      if (event === "SIGNED_OUT" && current) { current = null; me.role = ""; showLogin(); }
    }, 0);
  });
  window.addEventListener("hashchange", () => { if (me.role) route(); });
}

boot().catch((e) => showFatal(ptErr(e)));
