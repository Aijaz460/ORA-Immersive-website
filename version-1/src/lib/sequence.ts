// Scroll-scrubbed image sequence drawn to a canvas (object-fit: cover or contain).
//
// Frames are fetched as compressed blobs (cheap to hold: ~100 KB each) in priority order — the
// first frame, then every `stride`th so scrubbing works almost immediately, then the gaps.
// Drawing never decodes on the main thread: a rolling window of frames around the playhead is
// decoded off-thread into ImageBitmaps (prefetching further ahead in the direction of travel), and
// a frame that isn't ready yet is stood in for by the nearest decoded one. Holding every frame
// decoded is not an option (318 full-HD frames ≈ 2.6 GB), and letting the browser re-decode
// <img> frames inside drawImage stalls scrolling for 50–200 ms per frame.

export type Sequence = {
  draw: (progress: number) => void;
  resize: () => void;
  ready: Promise<void>;
  /** start fetching (only needed with `lazy`) */
  load: () => void;
};

type Pic = ImageBitmap | HTMLImageElement;
const widthOf = (p: Pic) => ("naturalWidth" in p ? p.naturalWidth : p.width);
const heightOf = (p: Pic) => ("naturalHeight" in p ? p.naturalHeight : p.height);

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
  const N = opts.count;
  const SOURCE_W = opts.sourceWidth ?? 1920;
  const ext = opts.ext ?? "webp";
  const focusY = opts.focusY ?? 0.35;
  const phone = typeof innerWidth === "number" && innerWidth < 860;
  // decoded frames kept at once (each full-HD frame is ~8 MB decoded)
  const MAX = phone ? 16 : 40;
  const AHEAD = phone ? 12 : 30;
  const BEHIND = phone ? 3 : 8;
  const bitmaps = typeof createImageBitmap === "function";

  const blobs: (Blob | undefined)[] = new Array(N);
  const cache = new Map<number, Pic>();
  const decoding = new Set<number>();
  let current = -1;
  let dir = 1;
  let fetched = 0;
  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => (resolveReady = r));
  let isReady = false;

  // Priority order: first frame, then every `stride`th, then 8th, 4th, 2nd, the rest.
  const stride = opts.stride ?? 8;
  const order: number[] = [0];
  const seen = new Set(order);
  for (const step of [stride, 8, 4, 2, 1])
    for (let i = 0; i < N; i += step)
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
  let readyAt = Math.ceil(N / stride) + 1;

  const checkReady = () => {
    if (!isReady && fetched >= readyAt && cache.has(0)) {
      isReady = true;
      resolveReady();
    }
  };

  // ---- decode window ----
  const decode = (i: number) => {
    const blob = blobs[i];
    if (!blob || cache.has(i) || decoding.has(i)) return;
    decoding.add(i);
    const done = (pic: Pic | null) => {
      decoding.delete(i);
      if (pic) {
        cache.set(i, pic);
        evict();
        // repaint if this frame is closer to the playhead than what is on screen
        if (current < 0 || Math.abs(i - current) < shownDist) paint(current < 0 ? 0 : current);
      }
      checkReady();
      pump();
    };
    if (bitmaps) {
      createImageBitmap(blob).then(done, () => done(null));
    } else {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.decode().then(
        () => done(img),
        () => done(null),
      );
    }
  };
  const DECODERS = 4;
  // the frames the playhead is heading into, nearest first
  const wanted = () => {
    const c = current < 0 ? 0 : current;
    const list: number[] = [];
    for (let d = 0; d <= AHEAD; d++) {
      list.push(c + dir * d);
      if (d > 0 && d <= BEHIND) list.push(c - dir * d);
    }
    return list.filter((i) => i >= 0 && i < N);
  };
  const pump = () => {
    if (decoding.size >= DECODERS) return;
    for (const i of wanted()) {
      if (decoding.size >= DECODERS) break;
      if (blobs[i] && !cache.has(i) && !decoding.has(i)) decode(i);
    }
  };
  const evict = () => {
    if (cache.size <= MAX) return;
    const c = current < 0 ? 0 : current;
    // drop the frames farthest from the playhead, favouring the ones behind it
    const far = [...cache.keys()].sort(
      (a, b) => Math.abs(b - c) * (Math.sign(b - c) === dir ? 1 : 2) - Math.abs(a - c) * (Math.sign(a - c) === dir ? 1 : 2),
    );
    while (cache.size > MAX && far.length) {
      const k = far.shift()!;
      if (k === 0 && !isReady) continue;
      const pic = cache.get(k);
      if (pic && "close" in pic) pic.close();
      cache.delete(k);
    }
  };

  // ---- fetching (compressed) ----
  const got = (i: number, blob: Blob | null) => {
    if (blob) blobs[i] = blob;
    fetched++;
    opts.onProgress?.(Math.min(fetched, readyAt), readyAt);
    if (i === 0) decode(0);
    else pump();
    checkReady();
  };
  const CONCURRENCY = opts.concurrency ?? 8;
  let next = 0;
  const fetchNext = () => {
    if (next >= order.length) return;
    const i = order[next++];
    fetch(`${opts.path}/${String(i + 1).padStart(3, "0")}.${ext}`)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((b) => {
        got(i, b);
        fetchNext();
      });
  };
  // Hosts with a file-count limit (the Claude artifact build) ship the frames packed into a few
  // bundles in the same priority order: bundle 0 is the first pass, so `ready` means the same thing.
  const loadBundles = async () => {
    const index: { bundles: { file: string; frames: [number, number, number][] }[] } = await (
      await fetch(`${opts.path}/index.json`)
    ).json();
    readyAt = index.bundles[0].frames.length;
    for (const b of index.bundles) {
      const buf = await (await fetch(`${opts.path}/${b.file}`)).arrayBuffer();
      for (const [i, off, len] of b.frames) got(i, new Blob([buf.slice(off, off + len)], { type: "image/webp" }));
    }
  };
  let started = false;
  const load = () => {
    if (started) return;
    started = true;
    if (process.env.NEXT_PUBLIC_SEQ_BUNDLE === "1") {
      loadBundles().catch(() => resolveReady());
    } else {
      for (let k = 0; k < CONCURRENCY; k++) fetchNext();
    }
  };
  if (!opts.lazy) load();

  // ---- painting ----
  let shownDist = Infinity; // how far the frame on screen is from the one asked for
  function nearest(i: number): [Pic | null, number] {
    for (let d = 0; d < N; d++) {
      const a = cache.get(i - d);
      if (a) return [a, d];
      const b = cache.get(i + d);
      if (b) return [b, d];
    }
    return [null, Infinity];
  }

  let lastPic: Pic | null = null;
  function paint(i: number, force = false) {
    const [pic, d] = nearest(i);
    if (!pic) return;
    shownDist = d;
    if (pic === lastPic && !force) return; // same pixels already on screen
    lastPic = pic;
    for (const { c, ctx } of targets) {
      if (!c.width) continue;
      const cw = c.width;
      const ch = c.height;
      const fit = opts.fit === "contain" ? Math.min : Math.max;
      const scale = fit(cw / widthOf(pic), ch / heightOf(pic));
      const w = widthOf(pic) * scale;
      const h = heightOf(pic) * scale;
      if (alpha) ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(pic, (cw - w) / 2, (ch - h) * focusY, w, h);
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
    paint(current < 0 ? 0 : current, true);
  }

  function draw(progress: number) {
    const i = Math.min(N - 1, Math.max(0, Math.round(progress * (N - 1))));
    if (i === current && shownDist === 0) return;
    if (i !== current && current >= 0) dir = i > current ? 1 : -1;
    current = i;
    paint(i);
    evict();
    pump();
  }

  resize();
  return { draw, resize, ready, load };
}
