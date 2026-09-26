// Guided scrolling for the pinned stories.
//
// A long pinned timeline scrubbed straight from the wheel feels wrong both ways: a gentle scroll
// barely moves it, and a trackpad flick's momentum sails through several beats at once. Inside a
// registered band every gesture (wheel, swipe, key) instead glides to the next resting beat at a
// designed speed, and the rest of that gesture's momentum is ignored. Outside the bands, and past
// a band's first/last beat, scrolling is untouched. Scrollbar drags settle on the nearest beat.
import type Lenis from "lenis";

type Steps = () => number[]; // absolute scroll positions of the resting beats, ascending
const bands = new Map<string, Steps>();

export function registerSteps(id: string, steps: Steps) {
  bands.set(id, steps);
  return () => {
    bands.delete(id);
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function installStepper(lenis: Lenis) {
  let stepping = false;
  let queued = 0; // a fresh gesture made mid-glide runs when the glide lands
  let lastWheel = 0;
  let lastMag = 0;
  let peak = 0; // strongest delta of the current gesture

  // the band a move in `dir` would stay inside (dir 0 = any band containing y)
  const bandAt = (y: number, dir: number) => {
    // audit scripts seek to arbitrary moments: they switch the guidance off
    if ((window as unknown as { __oraFreeScroll?: boolean }).__oraFreeScroll) return null;
    for (const get of bands.values()) {
      const s = get();
      if (s.length < 2) continue;
      const a = s[0];
      const b = s[s.length - 1];
      if (dir > 0 ? y >= a - 2 && y < b - 2 : dir < 0 ? y > a + 2 && y <= b + 2 : y >= a - 2 && y <= b + 2) return s;
    }
    return null;
  };
  const nextBeat = (s: number[], y: number, dir: number) =>
    dir > 0 ? s.find((v) => v > y + 4) : [...s].reverse().find((v) => v < y - 4);

  const glide = (target: number, from: number) => {
    const screens = Math.abs(target - from) / innerHeight;
    stepping = true;
    lenis.scrollTo(target, {
      duration: Math.min(2.4, Math.max(0.9, 0.7 + screens * 0.42)),
      easing: easeInOut,
      force: true,
      onComplete: () => {
        stepping = false;
        const q = queued;
        queued = 0;
        if (q) step(q);
      },
    });
  };
  const step = (dir: number) => {
    const y = lenis.targetScroll;
    const s = bandAt(y, dir);
    const t = s && nextBeat(s, y, dir);
    if (t == null) return false;
    glide(t, y);
    return true;
  };

  // ---- wheel / trackpad: one gesture = one beat ----
  lenis.options.virtualScroll = ({ deltaY, event }) => {
    if (event.type !== "wheel" || (event as WheelEvent).ctrlKey || !deltaY) return true;
    const dir = Math.sign(deltaY);
    const now = performance.now();
    const mag = Math.abs(deltaY);
    // a fresh gesture: after a pause, or a clear surge over the decaying momentum tail. Everything
    // else is the tail of a gesture already answered, however long the OS keeps it coming.
    // (a surge only counts once this gesture's momentum has decayed below half its peak, so the
    // rising start of one flick is never read as a second one)
    const paused = now - lastWheel > 180;
    const surge = !paused && lastMag < peak * 0.5 && mag > lastMag * 1.6 + 6;
    const fresh = paused || surge;
    peak = fresh ? mag : Math.max(peak, mag);
    lastWheel = now;
    lastMag = mag;
    if (!stepping && !bandAt(lenis.targetScroll, dir)) return true;
    if (event.cancelable) event.preventDefault();
    if (!fresh) return false;
    if (stepping) {
      queued = dir;
      return false;
    }
    if (!step(dir)) {
      // at a band edge: hand this gesture back to normal scrolling
      lenis.scrollTo(lenis.targetScroll + deltaY);
    }
    return false;
  };

  // ---- touch: one swipe = one beat ----
  let y0 = 0;
  let touchDir = 0;
  let owned = false;
  const onTouchStart = (e: TouchEvent) => {
    y0 = e.touches[0].clientY;
    touchDir = 0;
    owned = false;
  };
  const onTouchMove = (e: TouchEvent) => {
    const dy = y0 - e.touches[0].clientY;
    if (!touchDir && Math.abs(dy) > 6) {
      touchDir = Math.sign(dy);
      const s = bandAt(scrollY, touchDir);
      owned = stepping || !!(s && nextBeat(s, scrollY, touchDir) != null);
    }
    if (owned && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!owned) return;
    const dy = y0 - e.changedTouches[0].clientY;
    if (!stepping && Math.abs(dy) > 24) step(Math.sign(dy));
  };
  addEventListener("touchstart", onTouchStart, { passive: true });
  addEventListener("touchmove", onTouchMove, { passive: false });
  addEventListener("touchend", onTouchEnd, { passive: true });

  // ---- keyboard: arrows, page keys and space step too ----
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (e.altKey || e.ctrlKey || e.metaKey || t.closest?.("input, textarea, select, [contenteditable]")) return;
    const down = ["ArrowDown", "PageDown", " "].includes(e.key) && !(e.key === " " && e.shiftKey);
    const up = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
    if (!down && !up) return;
    // Space still presses a focused button or link
    if (e.key === " " && t.closest?.("button, a, summary, [role='button'], [tabindex]:not([tabindex='-1'])")) return;
    if (stepping) return e.preventDefault();
    if (step(down ? 1 : -1)) e.preventDefault();
  };
  addEventListener("keydown", onKey);

  // ---- anything else (scrollbar drag, find-in-page): settle on the nearest beat ----
  let settle = 0;
  const onScroll = () => {
    clearTimeout(settle);
    if (stepping) return;
    settle = window.setTimeout(() => {
      if (stepping || lenis.isScrolling === "smooth") return;
      const y = scrollY;
      const s = bandAt(y, 0);
      if (!s || s.some((v) => Math.abs(v - y) < 3)) return;
      const t = s.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
      glide(t, y);
    }, 220);
  };
  lenis.on("scroll", onScroll);

  return () => {
    clearTimeout(settle);
    lenis.options.virtualScroll = undefined;
    removeEventListener("touchstart", onTouchStart);
    removeEventListener("touchmove", onTouchMove);
    removeEventListener("touchend", onTouchEnd);
    removeEventListener("keydown", onKey);
  };
}
