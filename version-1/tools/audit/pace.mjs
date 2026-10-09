// Constant-rate wheel scroll through the story; per step record the visual change (mean abs pixel
// diff of consecutive screenshots) = perceived speed. Pace segments come from the page's own map.
import puppeteer from "puppeteer-core";
import { PNG } from "pngjs";
const [, , W = "1280", H = "800", STEP = "80"] = process.argv; const mob = +W < 860;
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars"] });
const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mob, hasTouch: mob });
await p.goto(process.env.URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__oraSeekY && (() => { const x = document.querySelector(".pre"); return !x || getComputedStyle(x).display === "none"; })(), { timeout: 60000 });
await new Promise(r => setTimeout(r, 1500)); await p.mouse.move(+W / 2, +H / 2);
const end = await p.evaluate(() => window.__oraSeekY(window.__oraJourney.duration()));
let prev = null; const rows = [];
const shot = async () => { const buf = await p.screenshot({ type: "png" }); const im = PNG.sync.read(Buffer.from(buf)); const small = []; for (let y = 0; y < im.height; y += 8) for (let x = 0; x < im.width; x += 8) { const i = (y * im.width + x) * 4; small.push(im.data[i], im.data[i + 1], im.data[i + 2]); } return small; };
while (true) {
  const y = await p.evaluate(() => scrollY);
  const t = await p.evaluate(() => window.__oraJourney.time());
  const cur = await shot();
  if (prev) { let d = 0; for (let i = 0; i < cur.length; i++) d += Math.abs(cur[i] - prev[i]); rows.push([Math.round(y), +t.toFixed(2), +(d / cur.length).toFixed(2)]); }
  prev = cur;
  if (y >= end - 2) break;
  await p.mouse.wheel({ deltaY: +STEP }); await new Promise(r => setTimeout(r, 450));
}
(await import("node:fs")).writeFileSync(`pace-${W}.json`, JSON.stringify(rows));
console.log("steps", rows.length);
await b.close();
