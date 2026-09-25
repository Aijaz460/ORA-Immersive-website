// Scroll-scrubbed image sequence drawn to a canvas (object-fit: cover).
// Frames are extracted from the Higgsfield / Seedance shots. Loading is progressive:
// every 4th frame first (so scrubbing works almost immediately), then the gaps.

export type Sequence = {
  draw: (progress: number) => void;
  resize: () => void;
  ready: Promise<void>;
  /** start fetching (only needed with `lazy`) */
  load: () => void;
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
    /** transparent frames (keyed characters): clear before each paint */
    alpha?: boolean;
    /** "contain" keeps the whole frame visible (characters); default "cover" */
    fit?: "cover" | "contain";
    /** more canvases painted with the same frame (e.g. the in-phone crop of the technician card) */
    mirrors?: HTMLCanvasElement[];
    /** don't fetch until load() is called */
    lazy?: boolean;
  },
): Sequence {
  const alpha = !!opts.alpha;
  const targets = [canvas, ...(opts.mirrors ?? [])].map((c) => ({
    c,
    ctx: c.getContext("2d", { alpha })!,
  }));
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
  let readyAt = Math.ceil(opts.count / stride) + 1;
  const decoded = new Uint8Array(opts.count); // 1 once a frame is fetched *and* decoded
  const CONCURRENCY = opts.concurrency ?? 8;
  let next = 0;

  const show = (i: number, img: HTMLImageElement) => {
    img.decoding = "async";
    // decode off the main thread before the frame is ever drawn (no sync decode mid-scroll)
    const done = () => {
      if (img.naturalWidth) decoded[i] = 1;
      loaded++;
      opts.onProgress?.(Math.min(loaded, readyAt), readyAt);
      if (loaded === readyAt) resolveReady();
      if (i === current || current < 0) paint(current < 0 ? 0 : current);
    };
    img.onload = () => {
      img.decode().then(done, done);
    };
    img.onerror = () => done();
    frames[i] = img;
  };

  const loadNext = () => {
    if (next >= order.length) return;
    const i = order[next++];
    const img = new Image();
    show(i, img);
    img.addEventListener("load", loadNext, { once: true });
    img.addEventListener("error", loadNext, { once: true });
    img.src = `${opts.path}/${String(i + 1).padStart(3, "0")}.${ext}`;
  };

  // Hosts with a file-count limit (the Claude artifact build) ship the frames packed into a few
  // bundles in the same priority order: bundle 0 is the first pass, so `ready` means the same thing.
  const loadBundles = async () => {
    const index: { bundles: { file: string; frames: [number, number, number][] }[] } = await (
      await fetch(`${opts.path}/index.json`)
    ).json();
    readyAtBundle = index.bundles[0].frames.length;
    readyAt = readyAtBundle;
    for (const b of index.bundles) {
      const buf = await (await fetch(`${opts.path}/${b.file}`)).arrayBuffer();
      for (const [i, off, len] of b.frames) {
        const img = new Image();
        show(i, img);
        img.src = URL.createObjectURL(new Blob([buf.slice(off, off + len)], { type: "image/webp" }));
      }
    }
  };
  let readyAtBundle = 0;
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    if (process.env.NEXT_PUBLIC_SEQ_BUNDLE === "1") {
      loadBundles().catch(() => resolveReady());
    } else {
      for (let k = 0; k < CONCURRENCY; k++) loadNext();
    }
  };
  if (!opts.lazy) load();

  function nearestLoaded(i: number) {
    for (let d = 0; d < frames.length; d++) {
      if (decoded[i - d]) return frames[i - d];
      if (decoded[i + d]) return frames[i + d];
    }
    return null;
  }

  function paint(i: number) {
    const img = nearestLoaded(i);
    if (!img) return;
    for (const { c, ctx } of targets) {
      if (!c.width) continue;
      const cw = c.width;
      const ch = c.height;
      const fit = opts.fit === "contain" ? Math.min : Math.max;
      const scale = fit(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      if (alpha) ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (cw - w) / 2, (ch - h) * focusY, w, h);
    }
  }

  function resize() {
    // Never render below the source frame's resolution: the scene zooms in on the film (leak push-in,
    // dive into the phone), so a screen-sized buffer would be stretched and look soft.
    // …but no higher than ~1.25× the source either: past that there is no detail to gain, only
    // pixels to push (the phone canvas is wider than the screen, so dpr alone overshoots badly).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const { c } of targets) {
      // offsetWidth ignores transforms (the phone screen is scaled by --s); layout size is what we paint
      const cwCss = c.offsetWidth || c.clientWidth;
      const chCss = c.offsetHeight || c.clientHeight;
      const k = Math.max(1, Math.min(dpr, (SOURCE_W * 1.25) / Math.max(1, cwCss)));
      c.width = Math.round(cwCss * k);
      c.height = Math.round(chCss * k);
    }
    paint(current < 0 ? 0 : current);
  }

  function draw(progress: number) {
    const i = Math.min(frames.length - 1, Math.max(0, Math.round(progress * (frames.length - 1))));
    if (i === current) return;
    current = i;
    paint(i);
  }

  resize();
  return { draw, resize, ready, load };
}
