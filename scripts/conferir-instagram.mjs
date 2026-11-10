// Confere no PRÓPRIO Instagram (lista as mídias recentes da conta pela Graph API) se cada peça
// aprovada e vencida realmente está no ar, e manda e-mail quando não está. Não olha log do
// robô: o log pode dizer "ok" e o post não existir (ou o robô nem ter rodado).
//
// Roda: node scripts/conferir-instagram.mjs            (confere e avisa)
//       node scripts/conferir-instagram.mjs --email-teste   (só manda um e-mail de teste)
//
// Precisa de META_IG_USER_ID e META_ACCESS_TOKEN (mesmos secrets do robô de publicação).
// E-mail pelo Gmail da Irisa: GMAIL_USER + GMAIL_APP_PASSWORD (senha de app), destino em
// ALERTA_EMAIL_PARA (se faltar, vai para o próprio GMAIL_USER). Sem as credenciais de e-mail o
// script termina com erro e o workflow abre uma issue no GitHub (que também chega por e-mail).
//
// Peças conferidas: POST e REELS aprovados, não arquivados, com a hora já vencida há mais de
// 45 min e até 7 dias atrás. Story fica de fora: é sempre publicação manual e some em 24 h.
// "Aprovado" vale se estiver em QUALQUER uma das duas filas (branch padrão ou de trabalho): se
// só a de trabalho tem a aprovação, o robô nunca vai ver, e isso também é motivo de aviso.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const IG = process.env.META_IG_USER_ID;
const TOKEN = process.env.META_ACCESS_TOKEN;
const API = "https://graph.facebook.com/v21.0";
const FILA = "docs/legendas/fila.json";
const ESTADO = "docs/legendas/conferencia.json";
const BRANCH_TRABALHO = "claude/laughing-keller-my8t7c";
const CARENCIA_MS = 45 * 60 * 1000;
const JANELA_MS = 7 * 24 * 60 * 60 * 1000;
const REAVISO_MS = 6 * 60 * 60 * 1000;

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 80);

export function semSegredo(texto) {
  let t = String(texto);
  if (TOKEN) t = t.split(TOKEN).join("***");
  if (process.env.GMAIL_APP_PASSWORD) t = t.split(process.env.GMAIL_APP_PASSWORD).join("***");
  return t.replace(/EAA[A-Za-z0-9]{20,}/g, "***");
}

async function listarMidias() {
  const url = new URL(`${API}/${IG}/media`);
  url.searchParams.set("fields", "id,caption,media_type,media_product_type,timestamp,permalink");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", TOKEN);
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(semSegredo(`${j.error.message} (código ${j.error.code ?? "?"})`));
  return j.data || [];
}

function lerFilaDoTrabalho() {
  try {
    execSync(`git fetch -q origin ${BRANCH_TRABALHO}`, { stdio: "ignore" });
    const txt = execSync(`git show origin/${BRANCH_TRABALHO}:${FILA}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(txt);
  } catch {
    return null; // branch inexistente ou sem a fila: confere só a padrão
  }
}

// Pura (testável): devolve { ok: [...], problemas: [...] }.
export function conferir({ filaPadrao, filaTrabalho, midias, agora }) {
  const porId = new Map(filaPadrao.map((i) => [i.id, i]));
  const trab = new Map((filaTrabalho || []).map((i) => [i.id, i]));
  const ids = new Set([...porId.keys(), ...trab.keys()]);
  const ok = [];
  const problemas = [];

  for (const id of ids) {
    const p = porId.get(id);
    const t = trab.get(id);
    const item = p || t;
    if (!item) continue;
    const storyAuto = item.tipo === "STORY" && !!(p?.automatico || t?.automatico);
    if (item.tipo === "STORY" && !storyAuto) continue; // story manual (com adesivo) fica de fora
    const aprovadoPadrao = !!p?.aprovado;
    const aprovadoTrabalho = !!t?.aprovado;
    if (!aprovadoPadrao && !aprovadoTrabalho) continue;
    if (p?.arquivado || t?.arquivado) continue;
    // a data que vale é a da fila do robô (a padrão); sem ela, a de trabalho
    const quando = new Date((p || t).quando);
    const atraso = agora - quando;
    if (atraso <= CARENCIA_MS || atraso > JANELA_MS) continue;

    const rotuloStory = `${id} (STORY, ${(p || t).quando})`;
    if (storyAuto) {
      // Story não aparece em /media e não tem legenda: confere pelo registro do robô
      // (media_id + confirmação feita na Graph API na hora da publicação).
      const minS = Math.round(atraso / 60000);
      if (!aprovadoPadrao) problemas.push({ id, motivo: "aprovacao-fora-da-padrao", texto: `${rotuloStory}: aprovado na fila de trabalho, mas NÃO na branch padrão que o robô lê. Venceu há ${minS} min.` });
      else if (p.publicado && p.confirmado !== false) ok.push({ id, permalink: p.confirmacao?.permalink || "", timestamp: p.publicado_em });
      else if (p.publicado) problemas.push({ id, motivo: "publicado-fantasma", texto: `${rotuloStory}: o robô diz que publicou, mas a confirmação na Graph API falhou: ${semSegredo(p.confirmado_erro || "?")}` });
      else problemas.push({ id, motivo: "nao-saiu", texto: `${rotuloStory}: aprovado, venceu há ${minS} min e o robô NÃO publicou.${p.ultimo_erro ? ` Último erro: ${semSegredo(p.ultimo_erro)}` : ""}` });
      continue;
    }
    const chave = norm((p || t).legenda);
    const achadas = midias.filter((m) => norm(m.caption) === chave);
    const min = Math.round(atraso / 60000);
    const rotulo = `${id} (${item.tipo}, ${(p || t).quando})`;

    if (achadas.length === 1) {
      ok.push({ id, permalink: achadas[0].permalink, timestamp: achadas[0].timestamp });
    } else if (achadas.length > 1) {
      problemas.push({ id, motivo: "duplicado", texto: `${rotulo}: aparece ${achadas.length} vezes no Instagram (publicação duplicada). ${achadas.map((m) => m.permalink).join(" ")}` });
    } else if (!aprovadoPadrao) {
      problemas.push({ id, motivo: "aprovacao-fora-da-padrao", texto: `${rotulo}: aprovado na fila de trabalho, mas NÃO na branch padrão que o robô lê. Nada vai sair até o merge. Venceu há ${min} min.` });
    } else if (p.publicado) {
      problemas.push({ id, motivo: "publicado-fantasma", texto: `${rotulo}: a fila diz publicado${p.publicado_em ? ` em ${p.publicado_em}` : ""}, mas NÃO está no Instagram. Venceu há ${min} min.` });
    } else {
      const erro = p.ultimo_erro ? ` Último erro do robô: ${semSegredo(p.ultimo_erro)}` : "";
      problemas.push({ id, motivo: "nao-saiu", texto: `${rotulo}: aprovado, venceu há ${min} min e NÃO está no Instagram.${erro}` });
    }
  }
  return { ok, problemas };
}

async function enviarEmail(assunto, corpo) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("faltam GMAIL_USER / GMAIL_APP_PASSWORD (secrets do GitHub) para mandar o e-mail");
  // o workflow instala só o nodemailer em ./.mail (não o projeto inteiro)
  const nodemailer = createRequire(`${process.cwd()}/.mail/package.json`)("nodemailer");
  const transporte = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  await transporte.sendMail({
    from: `Irisa — conferência do Instagram <${user}>`,
    to: process.env.ALERTA_EMAIL_PARA || user,
    subject: assunto,
    text: corpo,
  });
}

function lerEstado() {
  if (!existsSync(ESTADO)) return { alertas: {}, confirmados: {} };
  try {
    const e = JSON.parse(readFileSync(ESTADO, "utf8"));
    return { alertas: e.alertas || {}, confirmados: e.confirmados || {} };
  } catch {
    return { alertas: {}, confirmados: {} };
  }
}

async function main() {
  if (process.argv.includes("--email-teste")) {
    await enviarEmail("Irisa: teste do aviso de conferência do Instagram", "Se você recebeu este e-mail, o aviso está funcionando. Nenhuma peça foi conferida agora.");
    console.log("e-mail de teste enviado.");
    return;
  }
  if (!IG || !TOKEN) throw new Error("faltam META_IG_USER_ID / META_ACCESS_TOKEN no ambiente");

  const agora = new Date();
  const filaPadrao = JSON.parse(readFileSync(FILA, "utf8"));
  const filaTrabalho = lerFilaDoTrabalho();
  const estado = lerEstado();

  let midias;
  try {
    midias = await listarMidias();
  } catch (e) {
    // Não consegui nem olhar o Instagram: isso também é motivo de e-mail.
    const msg = `Não consegui consultar o Instagram para conferir as publicações: ${semSegredo(e.message)}\nProvável causa: token da Meta vencido ou sem permissão. Nada foi conferido nesta rodada.`;
    console.error(msg);
    const ultimo = estado.alertas["__consulta__"]?.em ? new Date(estado.alertas["__consulta__"].em) : null;
    if (!ultimo || agora - ultimo > REAVISO_MS) {
      await enviarEmail("Irisa: NÃO consegui conferir o Instagram", msg);
      estado.alertas["__consulta__"] = { em: agora.toISOString(), motivo: "consulta" };
      writeFileSync(ESTADO, JSON.stringify(estado, null, 1) + "\n");
    }
    process.exitCode = 1;
    return;
  }

  const { ok, problemas } = conferir({ filaPadrao, filaTrabalho, midias, agora });
  console.log(`${midias.length} mídias recentes lidas no Instagram; ${ok.length} peça(s) confirmada(s), ${problemas.length} problema(s).`);

  for (const o of ok) {
    estado.confirmados[o.id] = { permalink: o.permalink, timestamp: o.timestamp, conferido_em: agora.toISOString() };
    delete estado.alertas[o.id]; // resolveu: zera o controle de aviso
  }
  delete estado.alertas["__consulta__"];

  const novos = [];
  for (const p of problemas) {
    const antes = estado.alertas[p.id];
    const repetido = antes && antes.motivo === p.motivo && agora - new Date(antes.em) < REAVISO_MS;
    if (!repetido) novos.push(p);
  }

  if (novos.length) {
    const corpo = [
      "A conferência no próprio Instagram achou problema nas publicações abaixo:",
      "",
      ...novos.map((p) => `• ${p.texto}`),
      "",
      "O que fazer: abrir o Instagram e publicar à mão se for urgente, ou chamar a sessão do Claude no chat.",
      "Esta checagem roda a cada 30 min e repete o aviso a cada 6 h enquanto o problema continuar.",
    ].join("\n");
    console.error(corpo);
    await enviarEmail(`Irisa: ${novos.length} publicação(ões) NÃO está(ão) no Instagram`, corpo);
    for (const p of novos) estado.alertas[p.id] = { em: agora.toISOString(), motivo: p.motivo };
  }

  writeFileSync(ESTADO, JSON.stringify(estado, null, 1) + "\n");
  if (problemas.length) process.exitCode = 0; // o aviso já saiu por e-mail; o run só fica vermelho se o aviso falhar
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(semSegredo(e.stack || e.message));
    process.exitCode = 1;
  });
}
