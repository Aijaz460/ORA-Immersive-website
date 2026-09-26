"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { UNIT_VH, isMobile, prefersReducedMotion } from "@/lib/stage";
import { registerSteps } from "@/lib/steps";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Figma "Services" carousel (2:2590): the nine exact service screens from "All services background",
// frameless and rounded, each floating on its own white 3D glass slab. Scroll drives the coverflow;
// the screen in focus books itself (day → slot → Select) on a loop.
const SLIDES = [
  { name: "Cleaning", tint: "#c7deef" },
  { name: "AC & Mechanical", tint: "#cec3e1" },
  { name: "Pest Control", tint: "#dfe6fb" },
  { name: "Electrical", tint: "#f9daac" },
  { name: "Plumbing", tint: "#ceddc8" },
  { name: "Handyman", tint: "#f9daac" },
  { name: "Restoration", tint: "#cec3e1" },
  { name: "Landscaping", tint: "#ceddc8" },
  { name: "Water Tank Cleaning", tint: "#c7deef" },
];

// Tap targets in the 412×910 screen.
const DAY = { x: 208, y: 554 }; // Mon
const DAY_HOME = { x: 280, y: 554 }; // Tue (baked-in selection)
const SLOT = { x: 116, y: 738 }; // 14:00 – 16:00
const SLOT_HOME = { x: 296, y: 680 }; // 10:00 – 12:00
const SELECT = { x: 290, y: 814 };
const pct = (p: { x: number; y: number }) => ({ left: `${(p.x / 412) * 100}%`, top: `${(p.y / 910) * 100}%` });

const PER = 1.25; // timeline units per slide

export default function Showcase() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reduce = prefersReducedMotion();
    const cards = q<HTMLElement>(".sc__card");
    const n = cards.length;

    const ctx = gsap.context(() => {
      // ---- per-card auto demo: tap the day, the slot, then Select, forever ----
      const demos = cards.map((card) => {
        const ring = card.querySelector(".sc__tap")!;
        const day = card.querySelector(".sc__sel--day")!;
        const slot = card.querySelector(".sc__sel--slot")!;
        const btn = card.querySelector(".sc__press")!;
        const tap = (t: gsap.core.Timeline, at: string) =>
          t
            .fromTo(ring, { scale: 1 }, { scale: 0.7, duration: 0.14, ease: "power2.in" }, at)
            .to(ring, { scale: 1, duration: 0.3, ease: "back.out(3)" }, ">");
        const t = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.4, defaults: { ease: "power3.inOut" } });
        t.set(ring, { ...pct(DAY_HOME), autoAlpha: 0 })
          .set(day, pct(DAY_HOME))
          .set(slot, pct(SLOT_HOME))
          .to([day, slot], { autoAlpha: 1, duration: 0.3 }, 0)
          .to(ring, { autoAlpha: 1, duration: 0.3 }, 0.2)
          .to(ring, { ...pct(DAY), duration: 0.6 }, 0.4)
          .addLabel("d", ">");
        tap(t, "d").to(day, { ...pct(DAY), duration: 0.45, ease: "expo.out" }, "d+=0.1");
        t.to(ring, { ...pct(SLOT), duration: 0.7 }, "d+=0.7").addLabel("s", ">");
        tap(t, "s").to(slot, { ...pct(SLOT), duration: 0.45, ease: "expo.out" }, "s+=0.1");
        t.to(ring, { ...pct(SELECT), duration: 0.7 }, "s+=0.7").addLabel("b", ">");
        tap(t, "b")
          .fromTo(btn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, yoyo: true, repeat: 1 }, "b")
          .to(ring, { autoAlpha: 0, duration: 0.3 }, "b+=0.9")
          .to([day, slot], { autoAlpha: 0, duration: 0.3 }, "b+=0.9")
          .set(day, pct(DAY_HOME))
          .set(slot, pct(SLOT_HOME))
          .to([day, slot], { autoAlpha: 1, duration: 0.3 });
        return t;
      });

      // ---- coverflow, driven by scroll ----
      const setters = cards.map((c) => ({
        x: gsap.quickSetter(c, "x", "px"),
        z: gsap.quickSetter(c, "z", "px"),
        ry: gsap.quickSetter(c, "rotationY", "deg"),
        sx: gsap.quickSetter(c, "scaleX"),
        sy: gsap.quickSetter(c, "scaleY"),
        o: gsap.quickSetter(c, "opacity"),
      }));
      let current = -1;
      const layout = (p: number) => {
        const w = cards[0].offsetWidth;
        const gap = w * (isMobile() ? 0.78 : 0.86);
        cards.forEach((c, i) => {
          const d = i - p;
          const a = Math.abs(d);
          const s = setters[i];
          s.x(Math.sign(d) * (Math.min(a, 1) * gap + Math.max(0, a - 1) * gap * 0.62));
          s.z(-Math.min(a, 4) * 220);
          s.ry(gsap.utils.clamp(-40, 40, -d * 34));
          const k = 1 - Math.min(a, 3) * 0.06;
          s.sx(k);
          s.sy(k);
          s.o(a > 3.4 ? 0 : 1 - Math.max(0, a - 2.2) * 0.8);
          c.style.zIndex = String(100 - Math.round(a * 10));
          c.style.setProperty("--d", d.toFixed(3));
        });
        const idx = Math.round(gsap.utils.clamp(0, n - 1, p));
        if (idx !== current) {
          const prev = demos[current];
          if (prev) {
            prev.pause(0);
            gsap.set(cards[current].querySelectorAll(".sc__sel, .sc__tap, .sc__press"), { autoAlpha: 0 });
          }
          current = idx;
          if (!reduce) demos[idx].restart();
          setActive(idx);
          gsap.to(q(".sc__glow"), { backgroundColor: SLIDES[idx].tint, duration: 0.8, overwrite: true });
        }
      };

      const state = { p: 0 };
      const HOLD = 0.4; // beat on the first screen before the reel starts
      const units = HOLD + (n - 1) * PER + 0.6;
      // entrance: title and slabs pop up one by one while the section scrolls into view
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top 85%", end: "top top", scrub: reduce ? true : 0.35 },
        })
        .from(q(".sc__head .line > span"), { yPercent: 115, stagger: 0.1, duration: 0.6, ease: "power3.out" }, 0)
        .from(q(".sc__head p, .sc__head .eyebrow, .sc__meta"), { autoAlpha: 0, y: 20, stagger: 0.06, duration: 0.5 }, 0.1)
        .from(
          q(".sc__pop"),
          {
            y: () => innerHeight * 0.55,
            rotationX: 38,
            scale: 0.8,
            autoAlpha: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: { each: 0.09, from: "start" },
          },
          0.15,
        );
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * units * UNIT_VH * 1.4}`,
          pin: true,
          scrub: reduce ? true : 0.35,
          invalidateOnRefresh: true,
        },
      });
      tl.to(state, { p: n - 1, duration: (n - 1) * PER, ease: "none", onUpdate: () => layout(state.p) }, HOLD).to(
        {},
        { duration: 0.6 },
      );
      layout(0);

      // guided scroll: one gesture = one service card
      const unstep = registerSteps("showcase", () => {
        const st = tl.scrollTrigger!;
        const at = (t: number) => st.start + ((st.end - st.start) * t) / tl.duration();
        return [st.start, ...Array.from({ length: n }, (_, i) => at(HOLD + i * PER)), st.end].filter(
          (v, i, a) => i === 0 || v - a[i - 1] > 4,
        );
      });

      // arrows jump to a slide's scroll position
      const go = (dir: number) => {
        const st = tl.scrollTrigger!;
        const target = gsap.utils.clamp(0, n - 1, current + dir);
        const t = (HOLD + target * PER) / tl.duration();
        dispatchEvent(new CustomEvent("ora:scrollto", { detail: st.start + (st.end - st.start) * t }));
      };
      const prev = q(".sc__arrow--prev")[0];
      const next = q(".sc__arrow--next")[0];
      const onPrev = () => go(-1);
      const onNext = () => go(1);
      prev.addEventListener("click", onPrev);
      next.addEventListener("click", onNext);

      // pointer tilt of the whole stage
      const stage = q(".sc__stage")[0];
      const rx = gsap.quickTo(stage, "rotationX", { duration: 0.8, ease: "power3.out" });
      const ry = gsap.quickTo(stage, "rotationY", { duration: 0.8, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        rx(((e.clientY / innerHeight) - 0.5) * -6);
        ry(((e.clientX / innerWidth) - 0.5) * 8);
      };
      if (!reduce) el.addEventListener("pointermove", onMove);
      return () => {
        prev.removeEventListener("click", onPrev);
        next.removeEventListener("click", onNext);
        el.removeEventListener("pointermove", onMove);
        demos.forEach((d) => d.kill());
        unstep();
      };
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="sc" id="services" ref={root} aria-label="All nine Ora services">
      <div className="sc__glow" aria-hidden />
      <div className="sc__head">
        <span className="eyebrow">
          <Mark /> Nine services, one app
        </span>
        <h2 className="display">
          <span className="line">
            <span>Every service,</span>
          </span>
          <span className="line">
            <span>one tap away.</span>
          </span>
        </h2>
        <p>Pick a service, a day and a two-hour slot. That&apos;s the whole booking.</p>
      </div>

      <div className="sc__viewport">
        <div className="sc__stage">
          {SLIDES.map((s, i) => (
            <div className="sc__card" key={s.name} aria-hidden={i !== active}>
              <div className="sc__pop">
                <div className="sc__slab glass">
                  <div className="sc__screen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/app/svc-${i + 1}.webp`} alt={`${s.name} booking screen in the Ora app`} loading="lazy" decoding="async" />
                    <span className="sc__sel sc__sel--day" />
                    <span className="sc__sel sc__sel--slot" />
                    <span className="sc__press" style={pct(SELECT)} />
                    <span className="sc__tap" />
                  </div>
                  <span className="sc__sheen" aria-hidden />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sc__meta">
        <button className="sc__arrow sc__arrow--prev" type="button" aria-label="Previous service" data-magnetic>
          ←
        </button>
        <div className="sc__label glass">
          <span className="sc__count">
            {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <b key={active}>{SLIDES[active].name}</b>
        </div>
        <button className="sc__arrow sc__arrow--next" type="button" aria-label="Next service" data-magnetic>
          →
        </button>
      </div>
    </section>
  );
}
