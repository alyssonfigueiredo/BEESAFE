#!/usr/bin/env node
// Narração de story pela ElevenLabs (14/10/2026, pedido do Leandro). Roda no Mac, com a chave em
// .env.scripts (ELEVENLABS_API_KEY; opcional ELEVENLABS_VOICE_ID). Nunca gasta sem confirmar:
// mostra quantos caracteres vai converter e espera "s". Também roda na sessão cloud do Claude, com
// ELEVENLABS_API_KEY nas variáveis do ambiente (FFMPEG=/usr/bin/ffmpeg lá).
//
//   set -a && source .env.scripts && set +a
//   node scripts/narrar.mjs --vozes                         # lista as vozes da conta (não gasta)
//   node scripts/narrar.mjs docs/narracao/story-x.txt       # gera docs/narracao/story-x.mp3
//   node scripts/narrar.mjs docs/narracao/story-x.txt --voz <id> --video docs/Irisa-story.mp4
//        # também gera docs/Irisa-story-narrado.mp4 (vídeo + narração; a música entra no Instagram)
//
// Texto: português normal. Pausa: <break time="1.0s" /> no meio do texto. Linha começando com #
// é comentário e não vai para a voz.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const API = "https://api.elevenlabs.io/v1";
const MODELO = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2"; // fala português bem
const key = process.env.ELEVENLABS_API_KEY;
const args = process.argv.slice(2);
const opt = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!key) {
  console.error("Falta ELEVENLABS_API_KEY. Ponha no .env.scripts e rode: set -a && source .env.scripts && set +a");
  process.exit(1);
}

if (args.includes("--vozes")) {
  const r = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!r.ok) throw new Error(`ElevenLabs recusou (${r.status}): ${await r.text()}`);
  const { voices } = await r.json();
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${v.name}  ${[l.gender, l.accent, l.age, l.description].filter(Boolean).join(" · ")}`);
  }
  console.log("\nUse o id com --voz, ou grave ELEVENLABS_VOICE_ID no .env.scripts para virar o padrão.");
  process.exit(0);
}

const arquivo = args.find((a) => !a.startsWith("--") && a !== opt("--voz") && a !== opt("--video"));
if (!arquivo || !existsSync(arquivo)) {
  console.error("Diga o arquivo de texto: node scripts/narrar.mjs docs/narracao/story-x.txt");
  process.exit(1);
}
const voz = opt("--voz") ?? process.env.ELEVENLABS_VOICE_ID;
if (!voz) {
  console.error("Falta a voz: --voz <id> (veja com --vozes) ou ELEVENLABS_VOICE_ID no .env.scripts.");
  process.exit(1);
}

const texto = readFileSync(arquivo, "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("#"))
  .join("\n")
  .trim();
if (!texto) {
  console.error("O arquivo está vazio.");
  process.exit(1);
}

// Quanto ainda sobra na conta, para a conta antes de gastar.
let sobra = "";
try {
  const r = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": key } });
  if (r.ok) {
    const s = await r.json();
    sobra = ` (a conta tem ${(s.character_limit - s.character_count).toLocaleString("pt-BR")} de ${s.character_limit.toLocaleString("pt-BR")} neste mês, plano ${s.tier})`;
  }
} catch {
  /* sem a informação, segue só com a contagem */
}

console.log(`\nTexto (${texto.length} caracteres):\n\n${texto}\n`);
console.log(`Vai gastar cerca de ${texto.length.toLocaleString("pt-BR")} caracteres da ElevenLabs${sobra}.`);
// --sim pula a pergunta: só para a sessão do Claude, que pede o ok no chat antes de rodar.
let ok = args.includes("--sim") ? "s" : "";
if (!ok) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  ok = (await rl.question("Gerar a narração? (s/N) ")).trim().toLowerCase();
  rl.close();
}
if (ok !== "s" && ok !== "sim") {
  console.log("Nada gasto.");
  process.exit(0);
}

const r = await fetch(`${API}/text-to-speech/${voz}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
  body: JSON.stringify({
    text: texto,
    model_id: MODELO,
    language_code: "pt",
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
  }),
});
if (!r.ok) throw new Error(`ElevenLabs recusou (${r.status}): ${await r.text()}`);
const mp3 = arquivo.replace(/\.[^.]+$/, "") + ".mp3";
writeFileSync(mp3, new Uint8Array(await r.arrayBuffer()));
console.log(`Narração: ${mp3}`);

const video = opt("--video");
if (video) {
  if (!existsSync(video)) {
    console.error(`Vídeo não encontrado: ${video}`);
    process.exit(1);
  }
  const saida = video.replace(/\.mp4$/i, "") + "-narrado.mp4";
  const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
  // A narração começa meio segundo depois da primeira cena; o vídeo manda no tamanho (a voz não
  // estica o story, e silêncio completa o resto).
  execFileSync(ffmpeg, [
    "-y", "-i", video, "-i", mp3,
    "-filter_complex", "[1:a]adelay=500|500,apad[a]",
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
    saida,
  ], { stdio: "inherit" });
  console.log(`Story com narração: ${saida}`);
}
