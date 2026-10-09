// The Ora star on the app's splash, drawn as true vector geometry in screen space: the brand path is traced
// once into dense polygons (outline + centre hole), and every frame each point is carried through the same
// chain as the camera (the star's turn, the zoom, his screen's perspective, the camera move) and filled at the
// display's own pixel density. No bitmap is ever stretched, so the mark stays sharp at any zoom.
import { STAR_PATH } from "@/components/ui/Logo";
import { ORA_WORDMARK } from "./oraWordmark";

export type Pt = [number, number];

let polys: Pt[][] | null = null;

/** The star as polygons in its own path units (viewBox 58 0 64 64; centre 90, 32). */
export function starPolygons(): Pt[][] {
  if (polys) return polys;
  const tok = STAR_PATH.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let p: Pt = [0, 0];
  let cmd = "";
  let i = 0;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/^[MCLZ]$/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === "M") {
      if (cur.length) out.push(cur);
      p = [num(), num()];
      cur = [p];
      cmd = "L"; // further pairs after M are line-tos
    } else if (cmd === "L") {
      p = [num(), num()];
      cur.push(p);
    } else if (cmd === "C") {
      const c1: Pt = [num(), num()];
      const c2: Pt = [num(), num()];
      const e: Pt = [num(), num()];
      const N = 72; // dense: the hole's curves fill the whole screen at the end of the zoom
      for (let n = 1; n <= N; n++) {
        const t = n / N;
        const m = 1 - t;
        cur.push([
          m * m * m * p[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * e[0],
          m * m * m * p[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * e[1],
        ]);
      }
      p = e;
    } else if (cmd === "Z") {
      if (cur.length) out.push(cur);
      cur = [];
      cmd = "";
    } else {
      i++; // unexpected token: skip
    }
  }
  if (cur.length) out.push(cur);
  return (polys = out);
}

/** Projective map of the unit square onto a quad (corners TL, TR, BR, BL). */
export function quadHomography(q: Pt[]) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = p1[0] - p0[0] + g * p1[0], b = p3[0] - p0[0] + h * p3[0], c = p0[0];
  const d = p1[1] - p0[1] + g * p1[1], e = p3[1] - p0[1] + h * p3[1], f = p0[1];
  return (u: number, v: number): Pt | null => {
    const w = g * u + h * v + 1;
    if (w < 0.05) return null; // behind the screen's horizon: never reached in practice
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
  };
}

/**
 * Fill the star on `cv` (a canvas covering the viewport). `toScreen` maps app px on his screen (412×910) to
 * CSS px of the viewport. The star sits at `star` (app px centre and size), zoomed by `k` about its centre and
 * turned by `turn` radians.
 */
export function paintStar(
  cv: HTMLCanvasElement,
  toScreen: (ax: number, ay: number) => Pt | null,
  star: { x: number; y: number; size: number },
  k: number,
  turn: number,
  color = "#fce4b3",
) {
  const dpr = Math.min(devicePixelRatio || 1, 3);
  const w = Math.round(cv.clientWidth * dpr);
  const h = Math.round(cv.clientHeight * dpr);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = star.size / 64;
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  ctx.beginPath();
  for (const poly of starPolygons()) {
    let first = true;
    for (const [px, py] of poly) {
      const ux = (px - 90) * s;
      const uy = (py - 32) * s;
      const q = toScreen((ux * c - uy * sn) * k + star.x, (ux * sn + uy * c) * k + star.y);
      if (!q) continue;
      if (first) {
        ctx.moveTo(q[0] * dpr, q[1] * dpr);
        first = false;
      } else ctx.lineTo(q[0] * dpr, q[1] * dpr);
    }
    ctx.closePath();
  }
  ctx.fillStyle = color;
  ctx.fill("evenodd");

  // the "Ora" lettering: zooms with the splash about the star's centre (no turn), drawn as smooth curves
  // through the traced outline with the serif corners kept sharp
  if (k > 30) return;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  wordmarkCorners().forEach((corner, pi) => {
    const poly = ORA_WORDMARK[pi];
    const n = poly.length;
    const q: Pt[] = [];
    for (const [x, y] of poly) {
      const r = toScreen((x - star.x) * k + star.x, (y - star.y) * k + star.y);
      if (r) q.push([r[0] * dpr, r[1] * dpr]);
    }
    if (q.length !== n) return;
    const s0 = corner[0] ? q[0] : mid(q[n - 1], q[0]);
    ctx.moveTo(s0[0], s0[1]);
    for (let i = corner[0] ? 1 : 0; i < n; i++) {
      if (corner[i]) ctx.lineTo(q[i][0], q[i][1]);
      else {
        const m = mid(q[i], q[(i + 1) % n]);
        ctx.quadraticCurveTo(q[i][0], q[i][1], m[0], m[1]);
      }
    }
    ctx.closePath();
  });
  ctx.fill("evenodd");
}

let corners: boolean[][] | null = null;

/** Per outline point: a sharp corner (the outline turns by more than ~35° there) or part of a curve. */
function wordmarkCorners() {
  if (corners) return corners;
  return (corners = ORA_WORDMARK.map((p) =>
    p.map((c, i) => {
      const a = p[(i + p.length - 1) % p.length];
      const b = p[(i + 1) % p.length];
      let d = Math.abs(Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(c[1] - a[1], c[0] - a[0]));
      if (d > Math.PI) d = 2 * Math.PI - d;
      return d > 0.6;
    }),
  ));
}
