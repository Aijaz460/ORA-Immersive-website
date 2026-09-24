"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/stage";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Every card replays a real ORA flow with the app's own components (Figma "Components" 27:48165,
// exported 2×): the states cross-fade in order and a tap ring shows where the user taps.
// tap = where to tap on that state before moving on, in % of the component (x, y).
type Step = { src: string; tap?: [number, number]; hold?: number };
type Flow = { k: string; tint: string; label: string; title: string; body: string; alt: string; steps: Step[] };

const FLOWS: Flow[] = [
  {
    k: "ai",
    tint: "#F3EBDD",
    label: "Ora assistant",
    title: "Just tell Ora what's wrong",
    body: "Describe it in your own words and Ora suggests the right service and extras.",
    alt: "Ora assistant: pick a request and get suggested services",
    steps: [{ src: "ai-1", tap: [25, 77] }, { src: "ai-2", hold: 2.4 }],
  },
  {
    k: "book",
    tint: "#E6EEDC",
    label: "Booking",
    title: "Booked in under a minute",
    body: "Pick an opening, review, confirm with your number. Done.",
    alt: "Booking flow: choose a time, review, sign in and get confirmation",
    steps: [
      { src: "book-1", tap: [72, 66] },
      { src: "book-2", tap: [72, 81] },
      { src: "book-3", tap: [72, 80] },
      { src: "book-4", hold: 2.2 },
    ],
  },
  {
    k: "otp",
    tint: "#EAF1F6",
    label: "Sign in",
    title: "Your number is your account",
    body: "No passwords. A six-digit code and you are in.",
    alt: "Sign in with a one-time code",
    steps: [
      { src: "login-0", tap: [50, 68] },
      { src: "login-1", hold: 0.6 },
      { src: "login-2", hold: 0.5 },
      { src: "login-3", tap: [73, 71], hold: 1.2 },
    ],
  },
  {
    k: "welcome",
    tint: "#FBEFD6",
    label: "First visit",
    title: "Your address, set once",
    body: "Ora finds your building; add the unit and start booking.",
    alt: "Onboarding: confirm your address and unit number",
    steps: [
      { src: "welcome-1", tap: [50, 59] },
      { src: "welcome-2", tap: [30, 15] },
      { src: "welcome-3", tap: [73, 75] },
      { src: "welcome-4", hold: 2 },
    ],
  },
  {
    k: "price",
    tint: "#F7E4E1",
    label: "Clear pricing",
    title: "The price before you book",
    body: "Packages, materials and add-ons, all shown up front.",
    alt: "Choose a service type, a time and review the price",
    steps: [
      { src: "main-1", tap: [30, 30] },
      { src: "main-2", tap: [22, 51] },
      { src: "main-3", tap: [72, 94], hold: 1.6 },
    ],
  },
  {
    k: "res",
    tint: "#E6EEDC",
    label: "Reschedule",
    title: "Plans change. Slots move.",
    body: "Open your upcoming booking and move it in two taps.",
    alt: "Reschedule an upcoming booking",
    steps: [
      { src: "up-1", tap: [50, 30] },
      { src: "up-2", tap: [66, 84] },
      { src: "book-5", hold: 2.2 },
    ],
  },
];

export default function Features() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reduce = prefersReducedMotion();
    const fine = matchMedia("(pointer: fine)").matches;

    const ctx = gsap.context(() => {
      // ---- heading: word-by-word ----
      gsap.from(q(".ft__head .w > span"), {
        yPercent: 115,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.04,
        scrollTrigger: { trigger: q(".ft__head")[0], start: "top 78%" },
      });
      gsap.from(q(".ft__lead"), { autoAlpha: 0, y: 20, duration: 1, scrollTrigger: { trigger: q(".ft__head")[0], start: "top 70%" } });

      // ---- the 3D technician climbs out of his card and waves (the WebP loop does the greeting) ----
      const techCard = q(".fc--tech")[0];
      // Rises with the scroll; once he is fully out he stays out (the trigger retires at the end,
      // so scrolling back up never pushes him back into the card).
      gsap
        .timeline({
          scrollTrigger: {
            trigger: techCard,
            start: "top 85%",
            end: "top 30%",
            scrub: reduce ? true : 0.6,
            onLeave: (self) => {
              self.animation?.progress(1);
              self.kill(false);
            },
          },
        })
        .fromTo(q(".tech3d__avatar"), { yPercent: 62, scale: 0.9 }, { yPercent: 0, scale: 1, ease: "power2.out" })
        .fromTo(q(".tech3d__halo"), { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: "power2.out" }, 0)
        .from(q(".tech3d__pills span"), { y: 20, autoAlpha: 0, stagger: 0.1, ease: "power2.out" }, 0.3);
      // gentle parallax on the wrapper, never on the avatar itself (no fight over the same property)
      gsap.fromTo(
        q(".tech3d__clip"),
        { y: 0 },
        {
          y: -24,
          ease: "none",
          scrollTrigger: { trigger: techCard, start: "top 30%", end: "bottom top", scrub: reduce ? true : 0.6 },
        },
      );

      // ---- cards rise in with depth ----
      q<HTMLElement>(".fc").forEach((card, i) => {
        gsap.from(card, {
          y: 90 + (i % 3) * 30,
          rotateX: 14,
          autoAlpha: 0,
          duration: 1.3,
          ease: "expo.out",
          scrollTrigger: { trigger: card, start: "top 92%" },
        });
      });
      // slow parallax on the whole grid columns
      gsap.to(q(".ft__grid")[0], {
        y: -60,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.2 },
      });

      const loops: gsap.core.Timeline[] = [];
      q<HTMLElement>(".fc--flow").forEach((card) => {
        const c = gsap.utils.selector(card);
        const states = c<HTMLElement>(".uc__s");
        const ring = c(".uc__tap")[0];
        const steps = FLOWS.find((f) => f.k === card.dataset.flow)!.steps;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
        tl.set(states, { autoAlpha: 0, y: 14 }).set(states[0], { autoAlpha: 1, y: 0 }).set(ring, { autoAlpha: 0 });
        steps.forEach((st, i) => {
          const el = states[i];
          if (i) {
            tl.to(states[i - 1], { autoAlpha: 0, y: -10, scale: 0.985, duration: 0.45, ease: "power2.in" }).fromTo(
              el,
              { autoAlpha: 0, y: 16, scale: 1 },
              { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" },
              "-=0.15",
            );
          }
          tl.to({}, { duration: st.hold ?? 0.9 });
          if (st.tap) {
            const [px, py] = st.tap;
            tl.set(ring, { left: `${px}%`, top: () => (el.offsetHeight * py) / 100 })
              .fromTo(ring, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out" })
              .to(ring, { scale: 0.72, duration: 0.12, ease: "power2.in" })
              .to(ring, { scale: 1.25, autoAlpha: 0, duration: 0.35, ease: "power1.out" });
          }
        });
        // back to the first state for a seamless loop
        tl.to(states[steps.length - 1], { autoAlpha: 0, duration: 0.4 }, "+=0.4").to(states[0], { autoAlpha: 1, y: 0, duration: 0.5 }, "<");
        loops.push(tl);
        ScrollTrigger.create({
          trigger: card,
          start: "top 90%",
          end: "bottom 10%",
          onToggle: (self) => (self.isActive && !reduce ? tl.play() : tl.pause()),
        });
      });

      // ---- pointer tilt + spotlight ----
      const off: (() => void)[] = [];
      if (fine && !reduce) {
        q<HTMLElement>(".fc").forEach((card) => {
          const rx = gsap.quickTo(card, "rotationX", { duration: 0.8, ease: "power3" });
          const ry = gsap.quickTo(card, "rotationY", { duration: 0.8, ease: "power3" });
          const move = (e: PointerEvent) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.setProperty("--mx", `${px * 100}%`);
            card.style.setProperty("--my", `${py * 100}%`);
            rx((0.5 - py) * 7);
            ry((px - 0.5) * 9);
          };
          const leave = () => {
            rx(0);
            ry(0);
          };
          card.addEventListener("pointermove", move);
          card.addEventListener("pointerleave", leave);
          off.push(() => {
            card.removeEventListener("pointermove", move);
            card.removeEventListener("pointerleave", leave);
          });
        });
      }
      return () => {
        off.forEach((f) => f());
        loops.forEach((l) => l.kill());
      };
    }, el);
    return () => ctx.revert();
  }, []);

  const words = (s: string) =>
    s.split(" ").map((w, i) => (
      <span className="w" key={i}>
        <span dangerouslySetInnerHTML={{ __html: w + "&nbsp;" }} />
      </span>
    ));

  return (
    <section className="ft" id="features" ref={root} aria-label="App features">
      <div className="ft__head">
        <span className="eyebrow">
          <Mark /> The Ora app
        </span>
        <h2 className="display">
          {words("Everything your home needs,")}
          <br />
          {words("in one <em>calm</em> app.")}
        </h2>
        <p className="ft__lead">
          Every card below is the real Ora app, playing itself. No phone tag, no vague windows, no surprises.
        </p>
      </div>

      <div className="ft__grid">
        {/* 3D Ora technician (Higgsfield render + Kling animation, keyed to transparent WebP) */}
        <article className="fc fc--tech" data-cursor="Hello!">
          <div className="tech3d__copy">
            <header>
              <small>Your Ora technician</small>
              <h3>
                Friendly, uniformed and <em>on time</em>, every visit.
              </h3>
            </header>
            <p>
              Background-checked, trained in-house and on Ora&apos;s payroll. He arrives with the right tools, a fixed
              price and a report before he leaves.
            </p>
            <div className="tech3d__pills">
              <span>Background-checked</span>
              <span>4.9★ rated</span>
              <span>30-day guarantee</span>
            </div>
          </div>
          <div className="tech3d__stage" aria-hidden>
            <span className="tech3d__halo" />
            <div className="tech3d__clip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="tech3d__avatar" src="/img/technician-avatar.webp" alt="" loading="lazy" decoding="async" width={560} height={1028} />
            </div>
          </div>
        </article>

        {FLOWS.map((f) => (
          <article className={`fc fc--flow fc--${f.k}`} data-flow={f.k} key={f.k}>
            <header>
              <small>{f.label}</small>
              <h3>{f.title}</h3>
            </header>
            <p className="fc__body">{f.body}</p>
            <div className="uc" style={{ ["--tint" as string]: f.tint }} role="img" aria-label={f.alt}>
              <div className="uc__stack">
                {f.steps.map((st, i) => (
                  <div className="uc__s" key={st.src + i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/app/ui/${st.src}.webp`} alt="" loading="lazy" decoding="async" />
                  </div>
                ))}
                <span className="uc__tap" aria-hidden />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
