// Análise de melhor horário/dia pra postar no Instagram da Irisa, direto da Graph API
// (mesmo token do scripts/publicar-instagram.mjs), sem depender de ferramenta terceira.
// Roda: node scripts/instagram-insights.mjs
// Precisa de META_IG_USER_ID e META_ACCESS_TOKEN no ambiente.
//
// Cruza três fontes:
//  1. online_followers — quando os seguidores costumam estar online (proxy da Meta, por hora).
//  2. reach/profile_views por dia — qual dia da semana rende mais alcance.
//  3. posts reais já publicados — curtidas+comentários por horário em que saíram (dado concreto,
//     mais confiável que o proxy, mas só existe depois que a conta publica um tempo).

const IG = process.env.META_IG_USER_ID;
const TOKEN = process.env.META_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v21.0";

if (!IG || !TOKEN) throw new Error("faltam META_IG_USER_ID / META_ACCESS_TOKEN no ambiente");

function semSegredo(texto) {
  let t = String(texto);
  if (TOKEN) t = t.split(TOKEN).join("***");
  return t.replace(/EAA[A-Za-z0-9]{20,}/g, "***");
}

async function chamar(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(semSegredo(`${path}: ${j.error.message}`));
  return j;
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const fmtHora = (h) => `${String(h).padStart(2, "0")}h`;

// 1. Online followers: a Meta só aceita até ~30 dias de janela por chamada nesse metric.
async function onlineFollowers(dias = 30) {
  const until = new Date();
  const since = new Date(until.getTime() - dias * 86400000);
  const j = await chamar(`${IG}/insights`, {
    metric: "online_followers",
    period: "lifetime",
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
  });
  const pontos = j.data?.[0]?.values ?? [];
  // soma[diaDaSemana][hora] = total de seguidores online acumulado nesse slot
  const soma = Array.from({ length: 7 }, () => Array(24).fill(0));
  const contagem = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const p of pontos) {
    const dia = new Date(p.end_time).getDay();
    for (const [hora, valor] of Object.entries(p.value ?? {})) {
      soma[dia][Number(hora)] += valor;
      contagem[dia][Number(hora)] += 1;
    }
  }
  const media = soma.map((linha, d) => linha.map((v, h) => (contagem[d][h] ? v / contagem[d][h] : 0)));
  return { media, amostras: pontos.length };
}

// 2. Alcance por dia (últimos N dias), pra achar o melhor dia da semana.
async function alcancePorDia(dias = 30) {
  const until = new Date();
  const since = new Date(until.getTime() - dias * 86400000);
  const j = await chamar(`${IG}/insights`, {
    metric: "reach",
    period: "day",
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
  });
  const pontos = j.data?.[0]?.values ?? [];
  const soma = Array(7).fill(0);
  const contagem = Array(7).fill(0);
  for (const p of pontos) {
    const dia = new Date(p.end_time).getDay();
    soma[dia] += p.value ?? 0;
    contagem[dia] += 1;
  }
  return soma.map((v, d) => (contagem[d] ? v / contagem[d] : 0));
}

// 3. Performance real dos posts já publicados: curtidas+comentários por dia/hora de publicação.
async function performancePosts(limite = 50) {
  const j = await chamar(`${IG}/media`, {
    fields: "id,timestamp,like_count,comments_count,media_type",
    limit: String(limite),
  });
  const posts = (j.data ?? []).map((p) => ({
    data: new Date(p.timestamp),
    engajamento: (p.like_count ?? 0) + (p.comments_count ?? 0),
    tipo: p.media_type,
  }));
  const porSlot = {};
  for (const p of posts) {
    const dia = p.data.getDay();
    const hora = p.data.getHours();
    const chave = `${dia}-${hora}`;
    if (!porSlot[chave]) porSlot[chave] = { dia, hora, total: 0, n: 0 };
    porSlot[chave].total += p.engajamento;
    porSlot[chave].n += 1;
  }
  return { posts, porSlot: Object.values(porSlot).map((s) => ({ ...s, media: s.total / s.n })) };
}

function top(lista, n = 8) {
  return [...lista].sort((a, b) => b.valor - a.valor).slice(0, n);
}

async function main() {
  const linhas = [];
  const linha = (s = "") => { linhas.push(s); console.log(s); };

  linha("# Análise de horário — Instagram @irisapp\n");

  try {
    const { media, amostras } = await onlineFollowers(30);
    linha(`## Seguidores online (proxy da Meta, ${amostras} dias de amostra)\n`);
    const slots = [];
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) if (media[d][h] > 0) slots.push({ dia: d, hora: h, valor: media[d][h] });
    linha("Melhores 8 janelas (dia · hora · média de seguidores online):\n");
    for (const s of top(slots, 8)) linha(`- ${DIAS[s.dia]} · ${fmtHora(s.hora)} — ${s.valor.toFixed(0)}`);
    linha("");
  } catch (e) {
    linha(`## Seguidores online\n(não deu pra calcular: ${e.message})\n`);
  }

  try {
    const porDia = await alcancePorDia(30);
    linha("## Alcance médio por dia da semana (últimos 30 dias)\n");
    const ordenado = porDia.map((v, d) => ({ dia: d, valor: v })).sort((a, b) => b.valor - a.valor);
    for (const d of ordenado) linha(`- ${DIAS[d.dia]} — ${d.valor.toFixed(0)}`);
    linha("");
  } catch (e) {
    linha(`## Alcance por dia\n(não deu pra calcular: ${e.message})\n`);
  }

  try {
    const { posts, porSlot } = await performancePosts(50);
    linha(`## Performance real dos últimos ${posts.length} posts (curtidas + comentários)\n`);
    if (porSlot.length) {
      for (const s of top(porSlot.map((s) => ({ ...s, valor: s.media })), 8)) {
        linha(`- ${DIAS[s.dia]} · ${fmtHora(s.hora)} — média ${s.media.toFixed(1)} (${s.n} post${s.n > 1 ? "s" : ""})`);
      }
    } else {
      linha("(ainda sem posts suficientes pra cruzar por horário)");
    }
    linha("");
  } catch (e) {
    linha(`## Performance dos posts\n(não deu pra calcular: ${e.message})\n`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, linhas.join("\n") + "\n");
  }
}

main().catch((e) => {
  console.error(semSegredo(e.stack ?? e.message));
  process.exit(1);
});
