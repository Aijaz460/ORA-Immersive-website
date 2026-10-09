// Variant 2: the Ora mark flat (the app's own splash star, brand yellow), and the same portal into the site.
// Same interface as logo3d.ts so the story drives it identically. On scroll the mark makes a quarter
// turn (it settles back on itself) and the view flies through its square centre: the deep-red stage
// around it is one surface with the same opening, so the portal reveals the sky behind the canvas.
import type { Logo3D } from "./logo3d";

// brand mark, 900×900 svg units (Ora-Logo.svg)
const MARK =
  "M450 0C451.142 0.822703 588.453 99.9891 588.455 231.308C588.455 270.792 583.534 301.151 575.565 324.426C598.842 316.455 629.204 311.536 668.692 311.536C800.165 311.538 899.407 449.176 900 450L895.468 455.951C874.629 482.456 784.074 588.462 668.692 588.464C629.204 588.464 598.843 583.545 575.565 575.574C583.533 598.85 588.446 629.209 588.446 668.692C588.444 784.078 482.432 874.634 455.933 895.468L449.991 900C448.938 899.242 311.529 800.054 311.526 668.692C311.526 629.215 316.44 598.857 324.408 575.583C301.133 583.548 270.78 588.464 231.308 588.464C115.926 588.462 25.3707 482.456 4.53186 455.951L0 450C0.593491 449.175 99.8357 311.538 231.308 311.536C270.78 311.536 301.134 316.451 324.408 324.417C316.441 301.142 311.536 270.784 311.536 231.308C311.538 99.933 448.974 0.738909 450 0ZM510.58 389.42C491.113 393.907 470.831 396.286 450 396.286C429.168 396.286 408.888 393.908 389.42 389.42C393.908 408.888 396.286 429.168 396.286 450C396.286 470.831 393.907 491.113 389.42 510.58C408.888 506.092 429.169 503.714 450 503.714C470.83 503.714 491.113 506.093 510.58 510.58C506.093 491.113 503.714 470.83 503.714 450C503.714 429.169 506.092 408.888 510.58 389.42Z";
// the square opening alone (the second sub-path above), to cut the same hole through the stage
const HOLE =
  "M510.58 389.42C491.113 393.907 470.831 396.286 450 396.286C429.168 396.286 408.888 393.908 389.42 389.42C393.908 408.888 396.286 429.168 396.286 450C396.286 470.831 393.907 491.113 389.42 510.58C408.888 506.092 429.169 503.714 450 503.714C470.83 503.714 491.113 506.093 510.58 510.58C506.093 491.113 503.714 470.83 503.714 450C503.714 429.169 506.092 408.888 510.58 389.42Z";

const STAR = "#FCDDA1"; // brand light yellow: the splash screen's star
const REST = 0.58; // the mark spans 58% of the smaller screen side at rest (as the 3D mark)
const MAX = 46; // scale at the end of the flight: the opening is wider than any screen

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createLogo2D(canvas: HTMLCanvasElement, { reduce = false } = {}): Logo3D {
  const ctx = canvas.getContext("2d")!;
  const mark = new Path2D(MARK);
  const hole = new Path2D(HOLE);
  let dpr = 1;
  let W = 0;
  let H = 0;
  let progress = 0;
  let stageOn = true;
  let introT = reduce ? 1 : 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  let running = false;
  const t0 = performance.now();

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function frame() {
    const t = (performance.now() - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const intro = introT < 1 ? (introT = Math.min(1, introT + 0.014)) : 1;
    const ie = 1 - Math.pow(1 - intro, 3);

    const face = smooth(0, 0.34, progress); // the quarter turn
    const idle = 1 - face;
    const fly = smooth(0.22, 1, progress);
    // perspective-like approach: slow at first, then the opening opens up around you
    const zoom = 1 / (1 - (1 - 1 / MAX) * Math.pow(fly, 1.6));
    const size = REST * Math.min(W, H) * (0.62 + 0.38 * ie) * zoom; // mark width in css px
    const rot = face * (Math.PI / 2) + (1 - ie) * -0.5 + idle * (Math.sin(t * 0.45) * 0.05 + pointer.x * 0.04);
    const cx = W / 2 + idle * pointer.x * 10;
    const cy = H / 2 + idle * (Math.sin(t * 0.9) * 4 + pointer.y * 8);
    const k = size / 900;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const toMark = () => {
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(k, k);
      ctx.translate(-450, -450);
    };

    // the stage: deep brand red with a warm pool of light, one surface with the mark's opening
    // the stage stays solid: the sky is only ever seen through the opening, which grows past the
    // screen edges by the end of the flight (then the canvas itself is hidden by the story)
    const cover = stageOn ? 1 : 0;
    if (cover > 0) {
      ctx.save();
      ctx.globalAlpha = cover;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, "#6f281c");
      g.addColorStop(0.42, "#47150f");
      g.addColorStop(1, "#1e0906");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // punch the opening through the stage
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      toMark();
      ctx.fill(hole);
      ctx.restore();
    }

    // the mark: flat brand yellow, a soft lift off the stage while it is small enough to read as an object
    ctx.save();
    toMark();
    if (zoom < 2.5) {
      ctx.shadowColor = stageOn ? "rgba(20, 4, 2, 0.45)" : "rgba(30, 10, 4, 0.35)";
      ctx.shadowBlur = 40 * dpr * (1 - (zoom - 1) / 1.5);
      ctx.shadowOffsetY = 18 * dpr * (1 - (zoom - 1) / 1.5);
    }
    ctx.fillStyle = STAR;
    ctx.fill(mark, "evenodd");
    ctx.restore();
  }

  const loop = () => {
    frame();
    raf = running ? requestAnimationFrame(loop) : 0;
  };
  const setRunning = (on: boolean) => {
    if (on && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!on) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  const onVis = () => setRunning(!document.hidden && progress < 0.999);
  document.addEventListener("visibilitychange", onVis);

  fit();
  frame();
  canvas.classList.add("is-ready");
  setRunning(true);

  return {
    setProgress(p) {
      progress = p;
      if (p >= 0.999) {
        setRunning(false);
        frame();
      } else if (!document.hidden) setRunning(true);
    },
    setStage(on) {
      if (stageOn === on) return;
      stageOn = on;
      if (!running) frame();
    },
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    intro() {
      introT = reduce ? 1 : 0;
    },
    resize() {
      fit();
      frame();
    },
    dispose() {
      setRunning(false);
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}
