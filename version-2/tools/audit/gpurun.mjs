import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: false, defaultViewport: null, args: ["--window-size=1440,1000"] });
const p = (await b.pages())[0] || await b.newPage();
await p.goto(process.env.URL || "http://localhost:3000", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => window.__oraSeekY && (() => { const x = document.querySelector(".pre"); return !x || getComputedStyle(x).display === "none"; })(), { timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
const { w, h } = await p.evaluate(() => ({ w: innerWidth, h: innerHeight })); await p.mouse.move(w / 2, h / 2);
await p.evaluate(() => { window.__f = []; let last = performance.now(); const t = (n) => { window.__f.push(n - last); last = n; requestAnimationFrame(t); }; requestAnimationFrame(t); window.__long = []; let l2 = performance.now(); const t2 = (n) => { const d = n - l2; if (d > 34) window.__long.push([Math.round(d), Math.round(scrollY), (document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("section")?.className || "?").split(" ")[0]]); l2 = n; requestAnimationFrame(t2); }; requestAnimationFrame(t2); });
const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const t0 = Date.now();
while (true) { const y = await p.evaluate(() => scrollY); if (y >= total - 4 || Date.now() - t0 > 600000) break; await p.mouse.wheel({ deltaY: 60 }); await new Promise(r => setTimeout(r, 30)); }
await new Promise(r => setTimeout(r, 1500));
const f = await p.evaluate(() => window.__f); const s = [...f].sort((a, b) => a - b); const pc = q => s[Math.floor(s.length * q)].toFixed(1);
console.log(JSON.stringify({ secs: Math.round((Date.now() - t0) / 1000), frames: f.length, p50: pc(.5), p95: pc(.95), p99: pc(.99), over25: f.filter(x => x > 25).length, over50: f.filter(x => x > 50).length, long: await p.evaluate(() => window.__long.filter(x => x[0] > 50).slice(0, 12)) }));
await b.close();
