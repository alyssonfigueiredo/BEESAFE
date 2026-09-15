// Gera os ícones em assets/ a partir da marca (íris-radar). Uso: node scripts/gen-icons.mjs (precisa de Chromium).
// Em ambientes sem o canal "chromium" do Playwright, aponte o executável em CHROMIUM_PATH.
import { chromium } from "playwright-core";

import { mark, PAPER } from "./brand-mark.mjs";

const jobs = [
  ["icon.png", { size: 1024, bg: PAPER, pad: 0.1 }],
  ["splash-icon.png", { size: 512, bg: "transparent", pad: 0.04 }],
  ["android-icon-foreground.png", { size: 1024, bg: "transparent", pad: 0.34 }],
  ["android-icon-background.png", { size: 1024, bg: PAPER, pad: 1 }],
  ["android-icon-monochrome.png", { size: 1024, bg: "transparent", pad: 0.34, mono: true }],
  ["favicon.png", { size: 96, bg: PAPER, pad: 0.08 }],
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { channel: "chromium" },
);
const page = await browser.newPage();
for (const [name, opts] of jobs) {
  const svg = mark(opts);
  await page.setViewportSize({ width: opts.size, height: opts.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({
    path: `assets/${name}`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: opts.size, height: opts.size },
  });
  console.log("ok", name);
}
await browser.close();
