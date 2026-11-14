// Reels "O banheiro" (Semana da Visibilidade Trans).
// 1) monta o fundo com os 4 clipes do Gemini (cortes fixos abaixo) + 4 s de night para o fecho;
// 2) grava sobreposicao.html quadro a quadro com fundo transparente;
// 3) junta os dois e põe o som (som.py: áudio dos clipes + bordão + piano.flac) em docs/Irisa-reels-trans-banheiro.mp4.
// Uso: node docs/reels-pecas/trans-banheiro/render.mjs [--previa]
//   --previa só tira PNGs em alguns tempos (prev-*.png nesta pasta), sem gravar vídeo.
// FFMPEG= aponta outro binário; PW= aponta o playwright-core (padrão: node_modules do repo).
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const dir = new URL(".", import.meta.url).pathname;
const root = new URL("../../../", import.meta.url).pathname;
const FF = process.env.FFMPEG || "ffmpeg";
const { chromium } = await import(process.env.PW || root + "node_modules/playwright-core/index.mjs");
const exe = existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {};
const previa = process.argv.includes("--previa");

// [arquivo, início, duração, lentidão] — clip0 é a intro (7 s); clip1 roda 1,15x mais lento (11,5 s).
// Soma 37 s; o fecho (37–42,5 s) é desenhado pela sobreposição. Mudou aqui? Mudar também em som.py e piano.py.
const CORTES = [["clip0-intro.mp4", 0, 7], ["clip1-corredor.mp4", 0, 10, 1.15], ["clip2-celular.mp4", 0.3, 6.5], ["clip3-porta.mp4", 1, 5.5], ["clip4-mesa.mp4", 0.5, 6.5]];
const bg = dir + "fundo.mp4";
if (!previa || !existsSync(bg)) {
  const S = "scale=1080:1920:flags=lanczos,setsar=1,fps=30", N = CORTES.length;
  const args = ["-y", "-loglevel", "error"];
  CORTES.forEach(([f, ss, t]) => args.push("-ss", String(ss), "-t", String(t), "-i", dir + f));
  args.push("-f", "lavfi", "-t", "5.5", "-i", "color=c=0x141829:s=1080x1920:r=30");
  const fc = CORTES.map(([, , , slow = 1], i) => `[${i}:v]` + (slow !== 1 ? `setpts=${slow}*PTS,minterpolate=fps=30:mi_mode=blend,` : "") + S + `[v${i}]`).join(";") +
    `;[${N}:v]setsar=1[v${N}];` + CORTES.map((_, i) => `[v${i}]`).join("") + `[v${N}]concat=n=${N + 1}:v=1:a=0[v]`;
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
  for (const t of [2500, 5200, 6900, 10800, 16500, 23800, 28500, 35500, 42000]) {
    await pg.evaluate((x) => window.__setT(x), t);
    const ov = dir + `ov-${t}.png`;
    await shot({ path: ov });
    execFileSync(FF, ["-y", "-loglevel", "error", "-ss", String(t / 1000), "-i", bg, "-i", ov, "-filter_complex", "[0:v][1:v]overlay", "-frames:v", "1", dir + `prev-${t}.png`]);
  }
  await b.close(); console.log("prévias em", dir); process.exit(0);
}

const out = root + "docs/Irisa-reels-trans-banheiro.mp4", mudo = dir + "video-mudo.mp4", som = dir + "som.wav";
const total = await pg.evaluate(() => window.__TOTAL), fps = 30, frames = Math.round((total / 1000) * fps);
const ff = spawn(FF, ["-y", "-loglevel", "error", "-i", bg, "-f", "image2pipe", "-framerate", "30", "-c:v", "png", "-i", "-",
  "-filter_complex", "[0:v][1:v]overlay=shortest=1", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", mudo],
  { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, no) => ff.on("close", (c) => (c ? no(new Error("ffmpeg " + c)) : ok())));
for (let i = 0; i < frames; i++) {
  await pg.evaluate((x) => window.__setT(x), (i * 1000) / fps);
  if (!ff.stdin.write(await shot())) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end(); await done; await b.close();
// som: áudio original dos clipes + bordão + piano (som.py), nivelado para -16 LUFS com limitador
execFileSync("python3", [dir + "som.py", som], { stdio: "inherit", env: { ...process.env, FFMPEG: FF } });
const med = spawnSync(FF, ["-hide_banner", "-i", som, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const I = +[...med.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1], g = (-16 - I).toFixed(1);
execFileSync(FF, ["-y", "-loglevel", "error", "-i", mudo, "-i", som, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
  "-af", `volume=${g}dB,alimiter=limit=0.84:level=false`, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log("ok", out, frames, "quadros · som", I, "LUFS, ganho", g, "dB");
