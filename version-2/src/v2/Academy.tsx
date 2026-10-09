"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { UNIT_VH, isMobile, prefersReducedMotion } from "@/lib/stage";
import Lines from "@/components/ui/Lines";
import { Mark } from "@/components/ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// The Ora Academy: who actually comes to your home. One pinned scene: a cinema frame opens on the
// academy and steps through how a technician earns the Ora star, then the frame gives way to the
// certification seal. Photos: /v2/academy/{n}.webp (men in technical training, women in cleaning
// and hygiene training; Indian, Pakistani, Filipino and African trainees).
const STEPS = [
  {
    k: "01",
    tag: "Selected",
    title: "Chosen, then checked.",
    body: "Background checks, references and a practical test before anyone starts training.",
    alt: "A new intake of Ora trainees in the academy hall",
  },
  {
    k: "02",
    tag: "Technical training",
    title: "Hands-on, on real fixtures.",
    body: "Plumbing, electrical and AC on full-size training rigs, led by our senior technicians.",
    alt: "A trainee technician fitting a mixer tap on a training rig while an instructor watches",
    pos: "62% 50%", // keep the instructor on the right in frame
  },
  {
    k: "03",
    tag: "Cleaning & hygiene",
    title: "Hotel standard, room by room.",
    body: "Our cleaning teams train on materials, products and hygiene routines in a full mock apartment.",
    alt: "A cleaning trainee making a bed in the academy's mock apartment while others work in the kitchen",
  },
  {
    k: "04",
    tag: "Conduct & safety",
    title: "Respect for your home.",
    body: "Shoe covers, dust sheets, clear explanations and a tidy finish. Every visit, every home.",
    alt: "A technician laying a protective sheet before starting work",
  },
  {
    k: "05",
    tag: "Certified",
    title: "Only then, the Ora star.",
    body: "Every technician is assessed and certified before their first job, and keeps training on the job.",
    alt: "A trainee receiving an Ora certificate",
    pos: "46% 50%", // the handover, both men in frame
  },
];

const BADGES = [
  { t: "Background-checked", x: -1.05, y: -0.62, d: 1.2 },
  { t: "Safety & hygiene trained", x: 1.05, y: -0.38, d: 0.9 },
  { t: "In-house, on Ora payroll", x: -1.1, y: 0.42, d: 1 },
  { t: "30-day workmanship guarantee", x: 1.0, y: 0.64, d: 1.3 },
];

export default function Academy() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reduce = prefersReducedMotion();
    const ctx = gsap.context(() => {
      const shots = q<HTMLElement>(".v2-ac__shot");
      const steps = q<HTMLElement>(".v2-ac__step");
      const ticks = q<HTMLElement>(".v2-ac__rail i");
      const frame = q(".v2-ac__frame")[0];
      const STEP = 1.7; // timeline units per training stage
      // the frame: a card at rest, then the open window onto the academy (desktop: the right ~60%)
      const big = () =>
        isMobile()
          ? { left: "4vw", top: "10vh", width: "92vw", height: "46vh", borderRadius: 24 }
          : { left: "38vw", top: "9vh", width: "58vw", height: "82vh", borderRadius: 32 };
      gsap.set(shots.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
      // each stage is a short, calm film of the training itself (a seamless loop); only the one on screen plays
      const vids = q<HTMLVideoElement>(".v2-ac__shot video");
      let active = -2;
      const setActive = (i: number) => {
        if (i !== active) {
          active = i;
          vids.forEach((v, k) => {
            if (k === i || k === i + 1) v.preload = "auto"; // warm the next one too
            if (k !== i && k !== i - 1) v.pause(); // the previous one keeps playing under the wipe
          });
        }
        // (re)start the one on screen: a play() can be interrupted by a fast scrub or a hidden tab
        const v = vids[i];
        if (v && v.paused && !reduce) v.play().catch(() => {});
      };
      gsap.set(steps, { autoAlpha: 0, y: 24 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => {
          const t = tl.time();
          const c = 3 + STEPS.length * STEP;
          const i = Math.max(0, Math.min(STEPS.length - 1, Math.floor((t - 3 + 0.02) / STEP))); // with its wipe
          setActive(t > c + 0.5 ? -1 : i);
          ticks.forEach((d, k) => d.classList.toggle("is-on", t >= 3.2 && k <= i));
        },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * (5 + STEPS.length * STEP + 4) * UNIT_VH * 1.6}`,
          pin: true,
          scrub: reduce ? true : 0.6,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            if (!self.isActive) setActive(-1);
            else active = -2; // re-evaluate on the next update
          },
        },
      });

      // ---- the promise ----
      tl.from(q(".v2-ac__intro .line > span"), { yPercent: 115, stagger: 0.1, duration: 0.9, ease: "power3.out" }, 0)
        .from(q(".v2-ac__intro .eyebrow, .v2-ac__intro p"), { autoAlpha: 0, y: 20, duration: 0.7, stagger: 0.1 }, 0.2)
        .fromTo(
          frame,
          { left: "58vw", top: "30vh", width: "30vw", height: "46vh", borderRadius: 28, y: 80, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1.2, ease: "power3.out" },
          0.3,
        )
        .fromTo(vids[0], { scale: 1.18 }, { scale: 1.04, duration: 3.4 }, 0.3)
        // the intro steps aside; the window opens onto the academy
        .to(q(".v2-ac__intro"), { autoAlpha: 0, y: -50, duration: 0.8, ease: "power2.in" }, 1.9)
        .to(frame, { ...big(), duration: 1.4, ease: "power3.inOut" }, 1.9)
        .fromTo(q(".v2-ac__rail"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 2.8);

      // ---- five stages: each shot wipes up over the last, the copy and the rail follow ----
      STEPS.forEach((_, i) => {
        const t = 3 + i * STEP;
        if (i > 0) {
          tl.to(shots[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, t)
            .fromTo(vids[i], { scale: 1.16 }, { scale: 1.03, duration: STEP + 0.9 }, t)
            .to(steps[i - 1], { autoAlpha: 0, y: -24, duration: 0.4, ease: "power2.in" }, t);
        }
        tl.to(steps[i], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, t + (i ? 0.35 : 0));
      });

      // ---- certified: the window settles back, the seal stamps in, the guarantees gather round it ----
      const c = 3 + STEPS.length * STEP;
      tl.to(steps[STEPS.length - 1], { autoAlpha: 0, y: -24, duration: 0.4 }, c)
        .to(q(".v2-ac__rail"), { autoAlpha: 0, duration: 0.4 }, c)
        .to(frame, { autoAlpha: 0.22, scale: 0.94, filter: "blur(6px)", duration: 1, ease: "power2.inOut" }, c)
        .fromTo(
          q(".v2-ac__seal"),
          { autoAlpha: 0, scale: 1.8, rotate: -40 },
          { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.6)" },
          c + 0.4,
        )
        .fromTo(q(".v2-ac__ring"), { rotate: -120 }, { rotate: 60, duration: 4 }, c + 0.4)
        .from(q(".v2-ac__cert .line > span"), { yPercent: 115, stagger: 0.1, duration: 0.8, ease: "power3.out" }, c + 0.9)
        .from(q(".v2-ac__cert p"), { autoAlpha: 0, y: 16, duration: 0.6 }, c + 1.1);
      q<HTMLElement>(".v2-ac__badge").forEach((b, i) => {
        tl.fromTo(
          b,
          { autoAlpha: 0, x: 0, y: 0, scale: 0.6 },
          {
            autoAlpha: 1,
            x: () => Number(b.dataset.x) * (isMobile() ? innerWidth * 0.26 : Math.min(innerWidth * 0.3, 420)),
            y: () => Number(b.dataset.y) * (isMobile() ? innerHeight * 0.3 : Math.min(innerHeight * 0.34, 300)),
            scale: 1,
            duration: 1,
            ease: "expo.out",
          },
          c + 1.2 + i * 0.12,
        ).to(b, { y: `-=${24 * Number(b.dataset.d)}`, duration: 2 }, c + 2.4);
      });
      tl.to({}, { duration: 1.2 });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="v2-ac" ref={root} id="academy" aria-label="The Ora Academy">
      <div className="v2-ac__intro">
        <span className="eyebrow">
          <Mark /> The Ora Academy
        </span>
        <h2 className="display">
          <Lines>{["Every technician", "is <em>Ora-trained.</em>"]}</Lines>
        </h2>
        <p>
          Before anyone wears the Ora star, they learn our way of working: the trade, the safety rules, and how to
          look after a home that isn&apos;t theirs.
        </p>
      </div>

      <div className="v2-ac__frame">
        {STEPS.map((s, i) => (
          <figure className="v2-ac__shot" key={s.k} data-n={i + 1}>
            <video
              muted
              loop
              playsInline
              preload={i === 0 ? "auto" : "none"}
              poster={`/v2/academy/${i + 1}.webp`}
              aria-label={s.alt}
              style={"pos" in s ? { objectPosition: s.pos } : undefined}
            >
              <source src={`/v2/academy/${i + 1}.mp4`} type="video/mp4" />
            </video>
          </figure>
        ))}
      </div>

      <div className="v2-ac__steps">
        {STEPS.map((s) => (
          <div className="v2-ac__step" key={s.k}>
            <span className="eyebrow">
              <Mark /> Step {s.k} · {s.tag}
            </span>
            <h3 className="display">{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
        <div className="v2-ac__rail" aria-hidden>
          {STEPS.map((s) => (
            <i key={s.k}>
              <b>{s.k}</b>
            </i>
          ))}
        </div>
      </div>

      <div className="v2-ac__cert">
        <div className="v2-ac__seal" aria-hidden>
          <svg className="v2-ac__ring" viewBox="0 0 200 200">
            <defs>
              <path id="v2-ac-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <text>
              <textPath href="#v2-ac-ring" startOffset="0">
                ORA ACADEMY · CERTIFIED TECHNICIAN · ORA ACADEMY · CERTIFIED TECHNICIAN ·
              </textPath>
            </text>
          </svg>
          <Mark className="v2-ac__seal-mark" />
        </div>
        <h3 className="display">
          <Lines>{["Ora <em>Certified.</em>"]}</Lines>
        </h3>
        <p>The star on the uniform means the training is done.</p>
        {BADGES.map((b) => (
          <span className="v2-ac__badge glass" key={b.t} data-x={b.x} data-y={b.y} data-d={b.d}>
            <i>✓</i> {b.t}
          </span>
        ))}
      </div>
    </section>
  );
}
