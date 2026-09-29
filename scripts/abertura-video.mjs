// Grava docs/abertura.html (radar da Irisa) em MP4, quadro a quadro.
// Roda: node scripts/abertura-video.mjs
//   V=radar (padrão) | 1 (coração → espiral → radar) | 2 (radar → tela arco-íris) | 3 (teste: coração, cores saem com o radar da logo) | apple (logo vira maçã arco-íris)
//   FORMATO=story (1080×1920, padrão) | quadrado (1080×1080)
//   BG=paper (padrão) | night | verde (chroma para recortar no editor)
//   FRASE="texto" troca a frase debaixo do nome · SEMFIM=1 segura no final em vez de sair de cena · K=1.5 estica a linha do tempo · OUT=arquivo.mp4
// Precisa de ffmpeg com libx264 (FFMPEG=/caminho/ffmpeg para outro binário).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const FPS = Number(process.env.FPS ?? 30);
const FORMATO = process.env.FORMATO === "quadrado" ? "quadrado" : "story";
const BG = ["night", "verde"].includes(process.env.BG) ? process.env.BG : "paper";
const K = Number(process.env.K ?? 1);
const V = ["1", "2", "3", "apple"].includes(process.env.V) ? process.env.V : "radar";
const OUT = process.env.OUT ?? `docs/Irisa-abertura${V === "radar" ? "" : "-v" + V}${FORMATO === "quadrado" ? "-quadrado" : ""}${BG === "paper" ? "" : "-" + BG}.mp4`;
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const size = FORMATO === "quadrado" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };

const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: size, deviceScaleFactor: 1 });
const url = "file://" + resolve("docs/abertura.html") + `?capture&v=${V}&formato=${FORMATO}&bg=${BG}&k=${K}` + (process.env.SEMFIM ? "&semfim" : "") + (process.env.FRASE ? "&frase=" + encodeURIComponent(process.env.FRASE) : "");
await pg.goto(url, { waitUntil: "networkidle" });
// Sem internet (ou com o Google Fonts bloqueado), usa as fontes do próprio app.
const fontes = resolve("node_modules/@expo-google-fonts");
await pg.addStyleTag({ content: `
  @font-face{font-family:"Urbanist";font-weight:500;src:url("file://${fontes}/urbanist/500Medium/Urbanist_500Medium.ttf")}
  @font-face{font-family:"Space Grotesk";font-weight:400;src:url("file://${fontes}/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf")}` });
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
}
ff.stdin.end();
await done;
await b.close();
console.log(`${OUT} pronto: ${frames} quadros, ${FPS} fps`);
