// Chapter 07: dust and grit kicked up behind the van's rear wheels as it pulls away and drives off.
// Drawn as a pure function of the drive clip's progress (0..1), so it scrubs both ways with the scroll.

// Per drive-clip frame (16:9): the van's rear edge x and its width as fractions of the frame width, and
// its ground line y as a fraction of the frame height (measured from public/v2/seq/drive).
const TRACK: [number, number, number][] = [
  [0.8267, 0.8323, 0.4399], [0.8262, 0.8321, 0.4396], [0.8203, 0.8309, 0.437], [0.8135, 0.8293, 0.4339],
  [0.8057, 0.8276, 0.4304], [0.7964, 0.8256, 0.4262], [0.7861, 0.8233, 0.4216], [0.7739, 0.8206, 0.4161],
  [0.7612, 0.8178, 0.4104], [0.748, 0.8149, 0.4045], [0.7334, 0.8117, 0.3979], [0.7168, 0.808, 0.3905],
  [0.6992, 0.8041, 0.3826], [0.6816, 0.8003, 0.3747], [0.6626, 0.7961, 0.3661], [0.6431, 0.7918, 0.3573],
  [0.6235, 0.7874, 0.3485], [0.6025, 0.7828, 0.3391], [0.582, 0.7783, 0.3299], [0.5596, 0.7733, 0.3198],
  [0.5381, 0.7686, 0.3101], [0.5166, 0.7639, 0.3005], [0.4961, 0.7593, 0.2913], [0.4727, 0.7542, 0.2807],
  [0.4512, 0.7494, 0.2711], [0.4292, 0.7446, 0.2612], [0.4077, 0.7398, 0.2515], [0.3887, 0.7356, 0.243],
  [0.3657, 0.7306, 0.2327], [0.3462, 0.7263, 0.2239], [0.3262, 0.7218, 0.2149], [0.3062, 0.7174, 0.2059],
  [0.2861, 0.713, 0.1969], [0.2671, 0.7088, 0.1883], [0.248, 0.7046, 0.1798], [0.229, 0.7004, 0.1712],
  [0.2104, 0.6963, 0.1629], [0.1929, 0.6924, 0.155], [0.1748, 0.6885, 0.1468], [0.1572, 0.6846, 0.1389],
  [0.1401, 0.6808, 0.1313], [0.1235, 0.6771, 0.1238], [0.1074, 0.6736, 0.1166], [0.0923, 0.6703, 0.1098],
  [0.0771, 0.6669, 0.103], [0.062, 0.6636, 0.0961], [0.0474, 0.6603, 0.0896], [0.0322, 0.657, 0.0828],
  [0.0181, 0.6539, 0.0764], [0.0034, 0.6506, 0.0698], [-0.3, 0.5837, 0.05], [-0.3, 0.5837, 0.05],
];
const W0 = TRACK[0][2];

export const at = (p: number) => {
  const f = Math.min(Math.max(p, 0), 1) * (TRACK.length - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, TRACK.length - 1);
  const t = f - i;
  return TRACK[i].map((v, k) => v + (TRACK[j][k] - v) * t) as [number, number, number];
};

// deterministic noise: the same particle always behaves the same way
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PUFFS = 120; // soft dust clouds
const GRIT = 140; // fine grains
const PUFF_LIFE = 0.26; // in drive progress
const GRIT_LIFE = 0.1;

export function createDust(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let w = 0;
  let h = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.round(r.width * dpr);
    h = Math.round(r.height * dpr);
    canvas.width = w;
    canvas.height = h;
  };
  resize();

  // emission is front-loaded: a burst as the wheels bite, thinning as the van gets away
  const emitAt = (u: number) => 0.62 * Math.pow(u, 1.8);

  const draw = (p: number) => {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    if (p <= 0 || p >= 1) return;
    for (let i = 0; i < PUFFS; i++) {
      const te = emitAt(i / PUFFS);
      const age = p - te;
      if (age < 0 || age > PUFF_LIFE) continue;
      const k = age / PUFF_LIFE; // 0..1 over its life
      const [rx, gy, vw] = at(te);
      const s = vw / W0; // scales with the van
      // kicked up at one of the two rear wheels, it hangs where it was raised: spreads, lifts, thins
      const wheel = i % 2 ? 0.03 : 0.16;
      const x = (rx - wheel * s + (0.015 + rnd(i) * 0.05) * s * Math.sqrt(k) + (rnd(i + 9) - 0.5) * 0.05 * s) * w;
      const y = gy * h - (0.008 * s + (0.01 + rnd(i + 3) * 0.04) * s * Math.sqrt(k)) * w;
      const rad = (0.025 + 0.075 * k + rnd(i + 5) * 0.025) * s * w;
      const a = (1 - k) * (1 - k) * (0.13 + rnd(i + 7) * 0.12) * (1 - te * 0.7);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(201, 178, 148, ${a})`);
      g.addColorStop(0.55, `rgba(192, 168, 138, ${a * 0.5})`);
      g.addColorStop(1, "rgba(190, 166, 136, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < GRIT; i++) {
      const te = emitAt(i / GRIT) * 0.85;
      const age = p - te;
      if (age < 0 || age > GRIT_LIFE) continue;
      const k = age / GRIT_LIFE;
      const [rx, gy, vw] = at(te);
      const s = vw / W0;
      // grains fly back off the tyre in a short arc and fall
      const vx = 0.05 + rnd(i + 11) * 0.12;
      const vy = 0.03 + rnd(i + 13) * 0.06;
      const x = (rx - 0.05 * s + vx * s * k) * w;
      const y = gy * h - (0.004 * s + vy * s * k - 0.09 * s * k * k) * w;
      const r = (0.6 + rnd(i + 17) * 1.4) * s * (w / 1400);
      ctx.fillStyle = `rgba(120, 96, 70, ${(1 - k) * (0.5 + rnd(i + 19) * 0.4)})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return { draw, resize };
}
