// Scroll-scrubbed image sequence drawn to a canvas (object-fit: cover).
// Frames are extracted from the Higgsfield / Seedance shots. Loading is progressive:
// every 4th frame first (so scrubbing works almost immediately), then the gaps.

export type Sequence = {
  draw: (progress: number) => void;
  resize: () => void;
  ready: Promise<void>;
};

export function createSequence(
  canvas: HTMLCanvasElement,
  opts: {
    path: string;
    count: number;
    ext?: string;
    focusY?: number;
    onProgress?: (loaded: number, total: number) => void;
    sourceWidth?: number;
    /** first-pass stride: every Nth frame must be in before `ready` (8 desktop, 16 on phones) */
    stride?: number;
    concurrency?: number;
  },
): Sequence {
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const SOURCE_W = opts.sourceWidth ?? 1920;
  const ext = opts.ext ?? "webp";
  const focusY = opts.focusY ?? 0.35;
  const frames: HTMLImageElement[] = new Array(opts.count);
  let current = -1;
  let loaded = 0;
  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => (resolveReady = r));

  // Priority order: first frame, then every `stride`th (scrubbing already works), then 8th, 4th, 2nd, the rest.
  // A small queue keeps early frames from competing with 277 parallel requests.
  const stride = opts.stride ?? 8;
  const order: number[] = [0];
  const seen = new Set(order);
  for (const step of [stride, 8, 4, 2, 1])
    for (let i = 0; i < opts.count; i += step)
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
  const readyAt = Math.ceil(opts.count / stride) + 1;
  const decoded = new Uint8Array(opts.count); // 1 once a frame is fetched *and* decoded
  const CONCURRENCY = opts.concurrency ?? 8;
  let next = 0;

  const loadNext = () => {
    if (next >= order.length) return;
    const i = order[next++];
    const img = new Image();
    img.decoding = "async";
    // decode off the main thread before the frame is ever drawn (no sync decode mid-scroll)
    img.onload = () => {
      img.decode().then(done, done);
    };
    img.onerror = () => done();
    const done = () => {
      if (img.naturalWidth) decoded[i] = 1;
      loaded++;
      opts.onProgress?.(loaded, readyAt);
      if (loaded === readyAt) resolveReady();
      if (i === current || current < 0) paint(current < 0 ? 0 : current);
      loadNext();
    };
    img.src = `${opts.path}/${String(i + 1).padStart(3, "0")}.${ext}`;
    frames[i] = img;
  };
  for (let k = 0; k < CONCURRENCY; k++) loadNext();

  function nearestLoaded(i: number) {
    for (let d = 0; d < frames.length; d++) {
      if (decoded[i - d]) return frames[i - d];
      if (decoded[i + d]) return frames[i + d];
    }
    return null;
  }

  function paint(i: number) {
    const img = nearestLoaded(i);
    if (!img || !canvas.width) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (cw - w) / 2, (ch - h) * focusY, w, h);
  }

  function resize() {
    // Never render below the source frame's resolution: the scene zooms in on the film (leak push-in,
    // dive into the phone), so a screen-sized buffer would be stretched and look soft.
    // …but no higher than ~1.25× the source either: past that there is no detail to gain, only
    // pixels to push (the phone canvas is wider than the screen, so dpr alone overshoots badly).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.max(1, Math.min(dpr, (SOURCE_W * 1.25) / Math.max(1, canvas.clientWidth)));
    canvas.width = Math.round(canvas.clientWidth * k);
    canvas.height = Math.round(canvas.clientHeight * k);
    paint(current < 0 ? 0 : current);
  }

  function draw(progress: number) {
    const i = Math.min(frames.length - 1, Math.max(0, Math.round(progress * (frames.length - 1))));
    if (i === current) return;
    current = i;
    paint(i);
  }

  resize();
  return { draw, resize, ready };
}
