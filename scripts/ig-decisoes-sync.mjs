// Passa para docs/legendas/fila.json as decisões tomadas na tela "Instagram" do painel
// (tabela ig_decisoes, migration 84) e espelha os pedidos de alteração abertos em
// docs/legendas/pedidos.json, para qualquer sessão que abrir o repositório ver.
// Roda no workflow "Publicar Instagram", antes do robô, com o secret SUPABASE_DB_URL.
// Uso: SUPABASE_DB_URL=postgresql://... node scripts/ig-decisoes-sync.mjs
// Sem o secret, ou sem conexão, sai com aviso e código 0: a publicação não pode parar por isso.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILA = "docs/legendas/fila.json";
const PEDIDOS = "docs/legendas/pedidos.json";

function conexao() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) return null;
  const testa = (u) => {
    try {
      execFileSync("psql", [u, "-X", "-q", "-c", "select 1"], { stdio: "ignore", timeout: 20000 });
      return true;
    } catch {
      return false;
    }
  };
  // A conexão direta (db.<ref>.supabase.co) é só IPv6 e o GitHub não alcança: mesma troca pelo
  // pooler que scripts/aplicar-migrations.sh faz.
  const m = url.match(/^postgres(?:ql)?:\/\/postgres:(.*)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/(.*)$/);
  if (!m) return testa(url) ? url : null;
  for (const h of ["aws-0-us-east-1", "aws-1-us-east-1", "aws-0-sa-east-1", "aws-1-sa-east-1"]) {
    const u = `postgresql://postgres.${m[2]}:${m[1]}@${h}.pooler.supabase.com:5432/${m[3]}`;
    if (testa(u)) return u;
  }
  return null;
}

const url = conexao();
if (!url) {
  console.log("::warning::Sem SUPABASE_DB_URL ou sem conexão: decisões do painel não foram lidas nesta rodada.");
  process.exit(0);
}
const sql = (q) => execFileSync("psql", [url, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8", timeout: 30000 }).trim();
const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

// A tabela pode ainda não existir (migration não aplicada): não é erro.
if (sql("select to_regclass('public.ig_decisoes') is not null") !== "t") {
  console.log("Tabela ig_decisoes ainda não existe no banco: nada a sincronizar.");
  process.exit(0);
}

const linhas = sql(
  "select coalesce(json_agg(json_build_object('id', id, 'peca', peca, 'acao', acao) order by id), '[]') " +
    "from public.ig_decisoes where aplicado_em is null and acao <> 'pedido'",
);
const decisoes = JSON.parse(linhas || "[]");
const fila = JSON.parse(readFileSync(FILA, "utf8"));
const porId = new Map(fila.map((i) => [i.id, i]));
const SUFIXO = "-sem-adesivo";
const irma = (id) => porId.get(id.endsWith(SUFIXO) ? id.slice(0, -SUFIXO.length) : id + SUFIXO);
// Mesmo formato do campo `quando` da fila: hora de Brasília com o deslocamento escrito.
const agoraBR = () => {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 19) + "-03:00";
};

let mudou = false;
for (const d of decisoes) {
  const item = porId.get(d.peca);
  let resultado = "aplicado";
  if (!item) resultado = "recusado: peça não existe na fila";
  else if (d.acao === "aprovar" || d.acao === "publicar_agora") {
    if (item.publicado) resultado = "sem efeito: já publicada";
    else if (item.arquivado) resultado = "recusado: peça arquivada (reaproveitar antes)";
    else if (irma(item.id)?.aprovado && !irma(item.id)?.arquivado)
      resultado = "recusado: a outra versão do mesmo story já está aprovada";
    else {
      item.aprovado = true;
      if (d.acao === "publicar_agora") item.quando = agoraBR();
      mudou = true;
    }
  } else if (d.acao === "desaprovar") {
    if (item.publicado) resultado = "sem efeito: já publicada";
    else {
      item.aprovado = false;
      mudou = true;
    }
  } else if (d.acao === "arquivar") {
    if (item.publicado) resultado = "sem efeito: já publicada";
    else {
      item.arquivado = true;
      mudou = true;
    }
  } else if (d.acao === "reaproveitar") {
    delete item.arquivado;
    mudou = true;
  } else if (d.acao === "publicado") {
    // Publicada à mão (story com adesivo, por exemplo): o robô não tenta de novo.
    if (!item.publicado) {
      item.publicado = true;
      item.publicado_manual = true;
      item.publicado_em = new Date().toISOString();
      mudou = true;
    }
  }
  if (item && resultado === "aplicado") {
    const marca = `Painel (${agoraBR().slice(0, 10)}): ${d.acao}.`;
    item.nota = item.nota ? `${item.nota} ${marca}` : marca;
  }
  sql(`update public.ig_decisoes set aplicado_em = now(), resultado = ${lit(resultado)} where id = ${Number(d.id)}`);
  console.log(`${d.peca}: ${d.acao} → ${resultado}`);
}
if (mudou) writeFileSync(FILA, JSON.stringify(fila, null, 1));

// Pedidos de alteração abertos: espelho no repositório. Resolver é no painel.
const pedidos = JSON.parse(
  sql(
    "select coalesce(json_agg(json_build_object('id', id, 'peca', peca, 'texto', texto, 'criado_em', criado_em) order by id), '[]') " +
      "from public.ig_decisoes where aplicado_em is null and acao = 'pedido'",
  ) || "[]",
);
const novo = JSON.stringify(pedidos, null, 1) + "\n";
const antigo = existsSync(PEDIDOS) ? readFileSync(PEDIDOS, "utf8") : "[]\n";
if (novo !== antigo) writeFileSync(PEDIDOS, novo);
console.log(`${decisoes.length} decisão(ões) lida(s); ${pedidos.length} pedido(s) de alteração aberto(s).`);
