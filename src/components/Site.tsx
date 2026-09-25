"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { applyPhoneScale, prefersReducedMotion } from "@/lib/stage";
import Header from "./Header";
import Journey from "./scenes/Journey";
import Arrival from "./scenes/Arrival";
import Showcase from "./scenes/Showcase";
import Features from "./scenes/Features";
import Download from "./scenes/Download";
import Footer from "./Footer";

gsap.registerPlugin(ScrollTrigger);

export default function Site() {
  const pre = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    applyPhoneScale();
    ScrollTrigger.addEventListener("refreshInit", applyPhoneScale);

    // ---------- smooth scroll ----------
    const lenis = reduce ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true, syncTouch: false });
    const raf = (t: number) => lenis?.raf(t * 1000);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || a.getAttribute("href") === "#") return;
      const target = document.querySelector(a.getAttribute("href")!);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target as HTMLElement, { duration: 2.2 });
      else target.scrollIntoView();
    };
    document.addEventListener("click", onAnchor);
    // scenes ask for a smooth jump to an absolute scroll position (e.g. carousel arrows)
    const onScrollTo = (e: Event) => {
      const y = (e as CustomEvent<number>).detail;
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else scrollTo(0, y);
    };
    addEventListener("ora:scrollto", onScrollTo);

    // ---------- preloader: the app's own launch animation (Figma "Launch Animation") ----------
    const p = pre.current!;
    const pq = gsap.utils.selector(p);
    lenis?.stop();
    document.documentElement.classList.add("is-loading");
    const state = { pct: 0 };
    const pctEl = pq(".pre__pct")[0];
    const setPct = (v: number) => (pctEl.textContent = String(Math.round(v)).padStart(2, "0"));
    const onProgress = (e: Event) => {
      const v = (e as CustomEvent<number>).detail * 100;
      gsap.to(state, { pct: v, duration: 0.6, ease: "power2.out", onUpdate: () => setPct(state.pct) });
    };
    addEventListener("ora:progress", onProgress);

    const intro = gsap
      .timeline({ paused: true })
      .set(p, { backgroundColor: "#47150F" })
      .from(pq(".pre__word > *"), { yPercent: 120, duration: 0.9, stagger: 0.08, ease: "expo.out" }, "-=0.25")
      .from(pq(".pre__meta"), { autoAlpha: 0, duration: 0.6 }, "<");

    const outro = gsap
      .timeline({ paused: true })
      .to(pq(".pre__palm"), { autoAlpha: 0.55, scale: 1, duration: 1, ease: "power2.out" })
      .to(pq(".pre__word .logo__word, .pre__meta"), { autoAlpha: 0, y: -20, duration: 0.5, ease: "power2.in" }, "-=0.4")
      .to(p, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.2, ease: "expo.inOut" }, "-=0.35")
      .add(() => {
        document.documentElement.classList.remove("is-loading");
        (window as unknown as { __oraReady?: boolean }).__oraReady = true;
        dispatchEvent(new Event("ora:ready"));
        lenis?.start();
      }, "-=0.7")
      .set(p, { display: "none" });

    let heroReady = false;
    let introDone = false;
    const maybeOut = () => heroReady && introDone && outro.play();
    intro.eventCallback("onComplete", () => {
      introDone = true;
      maybeOut();
    });
    const onHeroReady = () => {
      heroReady = true;
      gsap.to(state, { pct: 100, duration: 0.4, onUpdate: () => setPct(state.pct) });
      maybeOut();
    };
    addEventListener("ora:hero-ready", onHeroReady);
    const fallback = setTimeout(onHeroReady, 5000);
    if (reduce) {
      intro.progress(1);
      outro.progress(1);
    } else intro.play();

    // ---------- cursor ----------
    const fine = matchMedia("(pointer: fine)").matches;
    const c = cursor.current!;
    let onMove: ((e: PointerEvent) => void) | null = null;
    let onOver: ((e: PointerEvent) => void) | null = null;
    if (fine && !reduce) {
      const dot = c.querySelector<HTMLElement>(".cursor__dot")!;
      const ring = c.querySelector<HTMLElement>(".cursor__ring")!;
      const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
      const dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
      const rx = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
      const ry = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });
      onMove = (e) => {
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
        c.classList.add("is-on");
      };
      onOver = (e) => {
        const hot = (e.target as HTMLElement).closest("a, button, [data-cursor]");
        c.classList.toggle("is-hot", !!hot);
        const label = (hot as HTMLElement | null)?.dataset?.cursor ?? "";
        c.querySelector(".cursor__label")!.textContent = label;
        c.classList.toggle("has-label", !!label);
      };
      addEventListener("pointermove", onMove);
      addEventListener("pointerover", onOver);
    }

    // ---------- magnetic buttons ----------
    const mags = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
    const magOff: (() => void)[] = [];
    if (fine && !reduce) {
      mags.forEach((m) => {
        const x = gsap.quickTo(m, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const y = gsap.quickTo(m, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const move = (e: PointerEvent) => {
          const r = m.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * 0.35);
          y((e.clientY - (r.top + r.height / 2)) * 0.35);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        m.addEventListener("pointermove", move);
        m.addEventListener("pointerleave", leave);
        magOff.push(() => {
          m.removeEventListener("pointermove", move);
          m.removeEventListener("pointerleave", leave);
        });
      });
    }

    // ---------- header colour: whatever section is under the header decides ----------
    const header = document.querySelector<HTMLElement>(".header")!;
    let headerQueued = false;
    const updateHeader = () => {
      headerQueued = false;
      const hit = document
        .elementsFromPoint(innerWidth / 2, 34)
        .find((n) => !header.contains(n) && n.closest("main section, footer"));
      const sec = hit?.closest<HTMLElement>("main section, footer");
      // the opening sky is bright beige: dark header text over it, even inside the (light) film section
      const overSky = !!hit?.closest(".jr__sky");
      header.classList.toggle("is-light", !overSky && sec?.dataset.header === "light");
      // plain text at the very top; a white glass capsule once the page moves
      header.classList.toggle("is-scrolled", scrollY > 40);
    };
    const queueHeader = () => {
      if (headerQueued) return;
      headerQueued = true;
      requestAnimationFrame(updateHeader);
    };
    addEventListener("scroll", queueHeader, { passive: true });
    lenis?.on("scroll", queueHeader);
    queueHeader();

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    addEventListener("load", refresh);

    return () => {
      ScrollTrigger.removeEventListener("refreshInit", applyPhoneScale);
      document.removeEventListener("click", onAnchor);
      removeEventListener("ora:scrollto", onScrollTo);
      removeEventListener("ora:progress", onProgress);
      removeEventListener("ora:hero-ready", onHeroReady);
      removeEventListener("load", refresh);
      clearTimeout(fallback);
      intro.kill();
      outro.kill();
      if (onMove) removeEventListener("pointermove", onMove);
      if (onOver) removeEventListener("pointerover", onOver);
      magOff.forEach((f) => f());
      removeEventListener("scroll", queueHeader);
      if (lenis) {
        gsap.ticker.remove(raf);
        lenis.destroy();
      }
    };
  }, []);

  return (
    <>
      <div className="pre" ref={pre} aria-hidden>
        <div className="pre__palm" />
        <div className="pre__word">
          <span className="logo">
            <span className="logo__word">Ora</span>
          </span>
        </div>
        <div className="pre__meta">
          <span>Home maintenance, done properly</span>
          <span>
            <span className="pre__pct">00</span>%
          </span>
        </div>
      </div>

      <Header />
      <main>
        {/* one persistent page title for assistive tech; the hero's display line animates away */}
        <h1 className="sr-only">Ora: in-house home maintenance in Dubai, booked in three taps</h1>
        <Journey />
        <Arrival />
        <Showcase />
        <Features />
        <Download />
      </main>
      <Footer />

      <div className="grain" aria-hidden />
      <div className="cursor" ref={cursor} aria-hidden>
        <div className="cursor__ring">
          <span className="cursor__label" />
        </div>
        <div className="cursor__dot" />
      </div>
    </>
  );
}
