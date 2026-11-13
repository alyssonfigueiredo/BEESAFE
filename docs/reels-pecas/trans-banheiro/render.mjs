// Reels "O banheiro" (Semana da Visibilidade Trans).
// 1) monta o fundo com os 4 clipes do Gemini (cortes fixos abaixo) + 4 s de night para o fecho;
// 2) grava sobreposicao.html quadro a quadro com fundo transparente;
// 3) junta os dois em docs/Irisa-reels-trans-banheiro.mp4 (sem áudio: música entra no Instagram).
// Uso: node docs/reels-pecas/trans-banheiro/render.mjs [--previa]
//   --previa só tira PNGs em alguns tempos (prev-*.png nesta pasta), sem gravar vídeo.
// FFMPEG= aponta outro binário; PW= aponta o playwright-core (padrão: node_modules do repo).
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const root = new URL("../../../", import.meta.url).pathname;
const FF = process.env.FFMPEG || "ffmpeg";
const { chromium } = await import(process.env.PW || root + "node_modules/playwright-core/index.mjs");
const exe = existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {};
const previa = process.argv.includes("--previa");

// [arquivo, início, duração] — soma 21 s; o fecho (21–25 s) é desenhado pela sobreposição.
const CORTES = [["clip1-corredor.mp4", 0, 7], ["clip2-celular.mp4", 1, 4.5], ["clip3-porta.mp4", 0, 4.5], ["clip4-mesa.mp4", 0.5, 5]];
const bg = dir + "fundo.mp4";
if (!previa || !existsSync(bg)) {
  const S = "scale=1080:1920:flags=lanczos,setsar=1,fps=30";
  const args = ["-y", "-loglevel", "error"];
  CORTES.forEach(([f, ss, t]) => args.push("-ss", String(ss), "-t", String(t), "-i", dir + f));
  args.push("-f", "lavfi", "-t", "4", "-i", "color=c=0x141829:s=1080x1920:r=30");
  const fc = CORTES.map((_, i) => `[${i}:v]${S}[v${i}]`).join(";") + ";[4:v]setsar=1[v4];" + "[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]";
  args.push("-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", bg);
  execFileSync(FF, args, { stdio: "inherit" });
}

const b = await chromium.launch(exe);
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto("file://" + dir + "sobreposicao.html?capture", { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
await pg.addStyleTag({ content: "html,body{background:transparent!important}" });
const shot = (o = {}) => pg.locator("#stage").screenshot({ type: "png", omitBackground: true, ...o });

if (previa) {
  // quadro do fundo + sobreposição no mesmo tempo
  for (const t of [2500, 6000, 10000, 14500, 19500, 23500]) {
    await pg.evaluate((x) => window.__setT(x), t);
    const ov = dir + `ov-${t}.png`;
    await shot({ path: ov });
    execFileSync(FF, ["-y", "-loglevel", "error", "-ss", String(t / 1000), "-i", bg, "-i", ov, "-filter_complex", "[0:v][1:v]overlay", "-frames:v", "1", dir + `prev-${t}.png`]);
  }
  await b.close(); console.log("prévias em", dir); process.exit(0);
}

const out = root + "docs/Irisa-reels-trans-banheiro.mp4";
const total = await pg.evaluate(() => window.__TOTAL), fps = 30, frames = Math.round((total / 1000) * fps);
const ff = spawn(FF, ["-y", "-loglevel", "error", "-i", bg, "-f", "image2pipe", "-framerate", "30", "-c:v", "png", "-i", "-",
  "-filter_complex", "[0:v][1:v]overlay=shortest=1", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
  { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, no) => ff.on("close", (c) => (c ? no(new Error("ffmpeg " + c)) : ok())));
for (let i = 0; i < frames; i++) {
  await pg.evaluate((x) => window.__setT(x), (i * 1000) / fps);
  if (!ff.stdin.write(await shot())) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end(); await done; await b.close();
console.log("ok", out, frames, "quadros");
