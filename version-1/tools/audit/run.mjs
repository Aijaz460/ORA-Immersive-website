// Real-scroll UX audit: wheel-scrolls the production build like a user, measures frame pacing,
// runs axe (WCAG 2.2 AA + best practice) at each stop and screenshots every stage.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const [, , label = "desktop", W = "1440", H = "900", DPR = "1", STOPS = "40"] = process.argv;
const out = path.resolve(`shots-${label}`);
fs.mkdirSync(out, { recursive: true });
const axeSrc = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-frame-rate-limit", "--disable-gpu-vsync"],
});
const page = await browser.newPage();
const mobile = Number(W) < 860;
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: +DPR, isMobile: mobile, hasTouch: mobile });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
page.on("requestfailed", (r) => errors.push("requestfailed: " + r.url()));

const t0 = Date.now();
await page.goto(process.env.URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });
// wait for the preloader to hand over
await page.waitForFunction(
  () => { const p = document.querySelector(".pre"); return !p || getComputedStyle(p).visibility === "hidden" || getComputedStyle(p).display === "none" || +getComputedStyle(p).opacity === 0; },
  { timeout: 30000 },
).catch(() => errors.push("preloader never finished"));
const introMs = Date.now() - t0;
await new Promise((r) => setTimeout(r, 1200));

await page.evaluate(axeSrc);
// frame pacing recorder
await page.evaluate(() => {
  window.__frames = [];
  window.__long = [];
  let last = performance.now();
  const tick = (t) => {
    const d = t - last;
    window.__frames.push(d);
    if (d > 50) {
      // which pinned scene is on screen
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const sec = el && el.closest("section");
      window.__long.push([Math.round(d), Math.round(scrollY), sec ? sec.className.split(" ")[0] : "?"]);
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const stops = +STOPS;
const found = {};
const cx = +W / 2, cy = +H / 2;
await page.mouse.move(cx, cy);
for (let s = 1; s <= stops; s++) {
  const target = (total * s) / stops;
  // wheel in small notches like a trackpad/mouse
  for (let k = 0; k < 400; k++) {
    const y = await page.evaluate(() => scrollY);
    if (y >= target - 4) break;
    await page.mouse.wheel({ deltaY: Math.min(120, target - y) });
    await new Promise((r) => setTimeout(r, 16));
  }
  await new Promise((r) => setTimeout(r, 900));
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] },
    });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ t: n.target.join(" "), m: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 200) })) }));
  });
  for (const v of r) for (const n of v.nodes) { const key = `${v.id} | ${n.t.slice(0, 80)}`; if (!found[key]) found[key] = { impact: v.impact, stop: s, msg: n.m }; }
  await page.screenshot({ path: path.join(out, `s${String(s).padStart(2, "0")}.jpg`), type: "jpeg", quality: 60 });
}
const frames = await page.evaluate(() => window.__frames);
const longFrames = await page.evaluate(() => window.__long);
const sorted = [...frames].sort((a, b) => a - b);
const pct = (p) => sorted[Math.floor(sorted.length * p)].toFixed(1);
const long = frames.filter((f) => f > 50).length;
const janky = frames.filter((f) => f > 25).length;
const docW = await page.evaluate(() => document.documentElement.scrollWidth);
const report = {
  label, viewport: `${W}x${H}@${DPR}`, introMs, scrollHeight: total, horizontalOverflow: docW > +W,
  frames: frames.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), over25ms: janky, over50ms: long,
  longFrames,
  a11y: found, errors: [...new Set(errors)].slice(0, 30),
};
fs.writeFileSync(`report-${label}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
