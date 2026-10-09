// Capture the journey at named beats: node beats.mjs W H tag url "label+off,label+off,..."
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const [, , W = "1440", H = "900", tag = "d", url = "http://localhost:3000", list] = process.argv;
const dir = `beats-${tag}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--hide-scrollbars"] });
const p = await b.newPage();
const mobile = +W < 860;
await p.setViewport({ width: +W, height: +H, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__oraSeekY && (() => { const x = document.querySelector(".pre"); return !x || getComputedStyle(x).display === "none"; })(), { timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => { window.__oraFreeScroll = true; });
const beats = list.split(",");
for (const [i, beat] of beats.entries()) {
  const y = await p.evaluate((beat) => {
    const tl = window.__oraJourney;
    const [lab, off] = beat.split("+"); const t = (tl.labels[lab] ?? 0) + Number(off || 0);
    return Math.round(window.__oraSeekY(t));
  }, beat);
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise(r => setTimeout(r, 2200));
  await p.screenshot({ path: `${dir}/${String(i).padStart(2, "0")}-${beat.replace(/[^a-z0-9.]/gi, "_")}.jpg`, type: "jpeg", quality: 70 });
}
console.log("errors:", errs.slice(0, 10));
await b.close();
