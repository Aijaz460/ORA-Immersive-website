// Shared layout helpers for the scroll scenes.

export const MOBILE = 860;
export const APP_W = 412; // ORA screens are designed at 412 × 910
export const APP_H = 910;
export const BEZEL = 11;
export const UNIT_VH = 0.3; // scroll length per timeline unit, as a fraction of viewport height

export const isMobile = () => innerWidth < MOBILE;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Phone scale: fit the 412×910 canvas to the viewport. Idempotent; call before measuring.
export function applyPhoneScale() {
  const h = isMobile() ? Math.min(innerHeight * 0.52, 600) : Math.min(innerHeight * 0.74, 800);
  document.documentElement.style.setProperty("--s", String(h / (APP_H + 2 * BEZEL)));
}

export const phoneScale = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--s")) || 1;
