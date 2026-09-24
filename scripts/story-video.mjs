// Grava docs/story.html (story 1080x1920) em docs/Irisa-story.mp4, quadro a quadro.
// Roda: node scripts/story-video.mjs   (precisa de ffmpeg com libx264; FFMPEG=/caminho/ffmpeg para outro binário)
// A página expõe window.__setT(ms) e window.__TOTAL: cada quadro congela todas as animações no tempo exato,
// então o vídeo sai liso mesmo que a captura seja lenta.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const FPS = Number(process.env.FPS ?? 30);
// MODE=story (60 s, área tracejada para o adesivo de link) · MODE=reels (78 s, fecho "O link está na bio")
// · MODE=storybio (60 s, fecho "O link está na bio"). Padrão: story.
const MODE = process.env.MODE ?? "story";
const CFG = { story: { k: 1.2245, bio: false, out: "docs/Irisa-story.mp4" }, reels: { k: 1.592, bio: true, out: "docs/Irisa-reels.mp4" }, storybio: { k: 1.2245, bio: true, out: "docs/Irisa-story-bio.mp4" } }[MODE];
if (!CFG) throw new Error("MODE deve ser story, reels ou storybio");
const OUT = process.env.OUT ?? CFG.out;
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";

const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await pg.goto("file://" + resolve("docs/story.html") + `?capture&k=${CFG.k}` + (CFG.bio ? "&bio" : ""), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
const total = await pg.evaluate(() => window.__TOTAL);
const frames = Math.round((total / 1000) * FPS);

const ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, fail) => ff.on("close", (c) => (c === 0 ? ok() : fail(new Error("ffmpeg saiu com " + c)))));

for (let i = 0; i < frames; i++) {
  await pg.evaluate((t) => window.__setT(t), (i * 1000) / FPS);
  const png = await pg.screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 60 === 0) process.stdout.write(`\r${i}/${frames}`);
}
ff.stdin.end();
await done;
await b.close();
console.log(`\n${OUT} pronto: ${frames} quadros, ${FPS} fps`);
