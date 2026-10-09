// Dense capture of the wake → dive hand-off, cropped around the phone.
import puppeteer from "puppeteer-core";
const [, , W, H, tag] = process.argv; const mob = +W < 860;
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars"] });
const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
await p.goto(process.env.URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__oraSeekY && (() => { const x = document.querySelector(".pre"); return !x || getComputedStyle(x).display === "none"; })(), { timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
const times = [["wake",0.9],["wake",1.25],["wake",1.8],["wake",2.6],["wake",3.1],["wake",3.7],["pop",0.25],["pop",0.6],["pop",1.2],["portal",0.6],["portal",1.4],["portal",2.0],["portal",2.5],["portal",2.8],["portal",3.0],["app",0.2],["app",0.9]];
// walk forward through the story so the lazy frames are loaded as a user would have them
const fs = await import("node:fs"); fs.rmSync(`frames-${tag}`, { recursive: true, force: true }); fs.mkdirSync(`frames-${tag}`);
let i = 0;
for (const [lab, o] of times) {
  const y = await p.evaluate((lab, o) => window.__oraSeekY(window.__oraJourney.labels[lab] + o), lab, o);
  await p.evaluate(y => window.scrollTo(0, y), y); await new Promise(r => setTimeout(r, 1300));
  await p.screenshot({ path: `frames-${tag}/${String(i++).padStart(2, "0")}-${lab}+${o.toFixed(2)}.jpg`, type: "jpeg", quality: 80 });
}
await b.close();
