"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createSequence } from "@/lib/sequence";
import type { Logo3D } from "@/lib/logo3d";
import {
  APP_H,
  APP_W,
  UNIT_VH,
  applyPhoneScale,
  isMobile,
  phoneScale,
  prefersReducedMotion,
} from "@/lib/stage";
import { FILM_SCREEN, STORY, TAPS } from "@/lib/journey";
import Phone from "../ui/Phone";
import Lines from "../ui/Lines";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Figma "Mobile UI Screens" exports, 2× — pixel-identical to the ORA app.
const SCREENS = [
  "splash-c",
  "home",
  "plumbing-open",
  "plumbing-picked",
  "date-base",
  "date",
  "review",
  "confirmed-base",
  "confirmed",
] as const;

// Glass cards of the date and confirmation screens (Figma, 2× crops) in app px: they lift off the
// screen in 3D and settle exactly onto the full screen, which then takes over pixel for pixel.
const POP = {
  plumbing: { x: 19, y: 449, w: 374, h: 122 }, // Services list card 5 with the list at y −300
  date: { x: 16, y: 456, w: 380, h: 412 },
  confirmed: { x: 16, y: 234, w: 380, h: 644 },
};

// the technician card sits 60px behind the device (perspective 1600px): this scale keeps it exactly
// in register with the in-phone crop
const TECH_Z = 1660 / 1600;

// Brand confetti for the confirmation burst: angle (deg), distance (× phone height), colour.
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  a: (i / 26) * 360 + (i % 3) * 7,
  r: 0.42 + ((i * 37) % 23) / 60,
  c: ["#47150F", "#FCDDA1", "#ABBD94", "#E9A23B", "#FDF4E2", "#C7DEEF"][i % 6],
  s: 0.6 + ((i * 13) % 7) / 10,
}));

// "Review your order" (Figma 20:33994): exact card crops, laid out in the glass window of the
// base screen (app px; window = x 16…396, y 267…718, under the fixed title and above the CTA).
const RV_SCROLL = 155;
const RV_CARDS = [
  { k: "service", x: 16, y: 8, w: 220 },
  { k: "date", x: 244, y: 8, w: 120 },
  { k: "time", x: 244, y: 116, w: 120 },
  { k: "dur", x: 16, y: 223, w: 120 },
  { k: "addr", x: 144, y: 223, w: 220 },
  { k: "ppl", x: 16, y: 329, w: 120 },
  { k: "toggle", x: 16, y: 435, w: 348 },
  { k: "special", x: 16, y: 498, w: 348 },
];

// Opening sky (Higgsfield stills): the cloud deck with an opening onto the villa community, and
// keyed cloud puffs at different depths that rush past as you fall through it.
// x/y/w in % of the viewport; d = depth (how hard it flies past).
const PUFFS = [
  { n: 5, x: 22, y: 70, w: 58, d: 1.35 },
  { n: 1, x: -14, y: 56, w: 50, d: 1.1 },
  { n: 2, x: 66, y: 54, w: 48, d: 1.1 },
  { n: 4, x: -10, y: 6, w: 30, d: 0.7 },
  { n: 3, x: 78, y: 4, w: 30, d: 0.7 },
  { n: 6, x: 58, y: 30, w: 22, d: 0.5 },
];

const TILES = [
  {
    src: "/img/tools/cleaning.webp",
    name: "Cleaning",
    x: -0.95,
    y: -0.36,
    d: 1.3,
  },
  {
    src: "/img/tools/ac-hammer.webp",
    name: "AC & Mechanical",
    x: 0.92,
    y: -0.3,
    d: 1,
  },
  {
    src: "/img/tools/electrical.webp",
    name: "Electrical",
    x: -1.02,
    y: 0.18,
    d: 0.8,
  },
  {
    src: "/img/tools/pest.webp",
    name: "Pest Control",
    x: 1.02,
    y: 0.12,
    d: 1.4,
  },
  {
    src: "/img/tools/handyman.webp",
    name: "Handyman",
    x: -0.78,
    y: 0.52,
    d: 1.1,
  },
  {
    src: "/img/tools/watertank.webp",
    name: "Water Tank",
    x: 0.84,
    y: 0.5,
    d: 0.9,
  },
];

const CHAPTERS = [
  {
    k: "01",
    eyebrow: "Services",
    title: ["Nine services.", "One <em>trusted</em> team."],
    body: "Every category is run by Ora's own vetted technicians. No marketplace roulette.",
  },
  {
    k: "02",
    eyebrow: "Plumbing",
    title: ["Choose exactly", "what you <em>need.</em>"],
    body: "Leak repairs, fixture installation, drains or water heaters. Fixed packages, clear scope.",
  },
  {
    k: "03",
    eyebrow: "Scheduling",
    title: ["Two-hour slots", "we <em>actually</em> keep."],
    body: "Pick a day and a precise arrival window. No waiting at home all afternoon.",
  },
  {
    k: "04",
    eyebrow: "Your technician",
    title: ["Real people.", "<em>Properly</em> trained."],
    body: "Background-checked, trained in-house and on our payroll. You see who is coming before they ring the bell.",
  },
  {
    k: "05",
    eyebrow: "Review",
    title: ["Everything on", "<em>one</em> screen."],
    body: "Service, slot, address and special requests. Confirm when it looks right.",
  },
  {
    k: "06",
    eyebrow: "Confirmed",
    title: ["Booked in", "<em>three</em> taps."],
    body: "Your reference number arrives instantly. Live updates follow until the job is done.",
  },
  {
    k: "07",
    eyebrow: "On the way",
    title: ["Accepted.", "<em>On his</em> way."],
    body: "Your technician accepts in seconds and rides over with the right tools. Follow him live to your door.",
  },
];

export default function Journey() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    applyPhoneScale();
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const reduce = prefersReducedMotion();

    const canvas = q<HTMLCanvasElement>(".jr__canvas")[0];
    const seq = createSequence(canvas, {
      path: isMobile() ? STORY.mobilePath : STORY.path,
      count: STORY.frames,
      sourceWidth: isMobile() ? 1600 : 1920,
      stride: isMobile() ? 16 : 8,
      concurrency: isMobile() ? 4 : 8,
      focusY: 0.5,
      onProgress: (n, t) =>
        dispatchEvent(
          new CustomEvent("ora:progress", { detail: Math.min(1, n / t) }),
        ),
    });
    seq.ready.then(() => {
      dispatchEvent(new Event("ora:hero-ready"));
    });
    // Late-story clips (Higgsfield): the technician's smile and folded arms, scrubbed in both the card
    // and the in-phone crop; the 3D technician accepting the job and riding off (keyed, transparent).
    // They load once the viewer is into the story so they never compete with the opening frames.
    const clip = { stride: 4, concurrency: 3, lazy: true };
    const techSeq = createSequence(q<HTMLCanvasElement>(".jr__techcv--card")[0], {
      ...clip,
      path: "/seq/tech",
      count: 61,
      sourceWidth: 1100,
      focusY: 0,
      mirrors: [q<HTMLCanvasElement>(".jr__techcv--phone")[0]],
    });
    const acceptSeq = createSequence(q<HTMLCanvasElement>(".jr__avcv")[0], {
      ...clip,
      path: "/seq/accept",
      count: 61,
      sourceWidth: 540,
      alpha: true,
      fit: "contain",
      focusY: 1,
    });
    const rideSeq = createSequence(q<HTMLCanvasElement>(".jr__ridecv")[0], {
      ...clip,
      path: "/seq/ride",
      count: 61,
      sourceWidth: 720,
      alpha: true,
      fit: "contain",
      focusY: 1,
    });
    const clips = [techSeq, acceptSeq, rideSeq];
    const loadClips = () => clips.forEach((c) => c.load());
    const clipTimer = setTimeout(loadClips, 12000); // fallback if the viewer lingers at the top
    const onResize = () => [seq, ...clips].forEach((s) => s.resize());
    addEventListener("resize", onResize);

    // the 3D mark (three.js) loads on demand; the stage paints brand red until it is ready
    let logo: Logo3D | null = null;
    document.documentElement.classList.add("on-mark");
    let logoGone = false;
    const logoCanvas = q<HTMLCanvasElement>(".jr__logo3d")[0];
    import("@/lib/logo3d").then(({ createLogo3D }) => {
      if (logoGone) return;
      try {
        logo = createLogo3D(logoCanvas, { reduce });
      } catch {
        logoCanvas.classList.add("is-fallback"); // no WebGL: the flat brand mark stands in
      }
    });
    const onLogoPointer = (e: PointerEvent) =>
      logo?.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    const onLogoResize = () => logo?.resize();
    addEventListener("pointermove", onLogoPointer);
    addEventListener("resize", onLogoResize);

    const ctx = gsap.context(() => {
      const scene = q(".jr__scene")[0];
      const filmScreen = q(".jr__filmscreen")[0];
      const env = q(".jr__env")[0];
      const phoneWrap = q(".jr__phone")[0];
      const screens = q<HTMLElement>(".jr__scr");
      const byName = (n: (typeof SCREENS)[number]) =>
        screens[SCREENS.indexOf(n)];
      const ring = q(".jr__ring")[0];
      const chapters = q<HTMLElement>(".jr__chapter");
      const tiles = q<HTMLElement>(".jr__tile");
      const techCard = q(".jr__techcard")[0];
      const techPhoto = q(".jr__techphoto")[0];
      const techCards = q<HTMLElement>(".jr__qcard");
      const rvCards = q<HTMLElement>(".jr__rv-card");
      let lastScrub = 0;
      const tapFrame = q(".jr__tapframe")[0];
      const finger = q(".jr__finger")[0];
      const iosIcon = q(".jr__fs--icon")[0];
      const splashA = q(".jr__fs--a")[0];
      const splashB = q(".jr__fs--b")[0];
      const listInner = q(".jr__list-inner")[0];
      const cardsIn = q<HTMLElement>(".jr__card");
      const state = { frame: 0, count: 0, tech: 0, accept: 0, ride: 0 };

      // ---------- intro once the preloader lifts: the 3D Ora mark holds the first screen ----------
      const introTl = gsap
        .timeline({ paused: true })
        .call(() => logo?.intro())
        // children only: the scroll timeline owns the cue itself, so a fast scroll during the intro can't revive it
        .from(q(".jr__logocue > *"), { autoAlpha: 0, y: 16, duration: 1.2, ease: "expo.out" }, 0.6)
        .from(
          q(".jr__puffw"),
          { autoAlpha: 0, y: 40, duration: 2, ease: "expo.out", stagger: 0.08 },
          0.2,
        );
      // idle drift so the sky is alive before the first scroll (wrapper only; scroll owns the img)
      q<HTMLElement>(".jr__puffw").forEach((w, i) =>
        gsap.to(w, {
          x: i % 2 ? 26 : -26,
          y: i % 3 ? -10 : 10,
          duration: 7 + i * 1.3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        }),
      );
      const go = () => introTl.play();
      if ((window as unknown as { __oraReady?: boolean }).__oraReady)
        introTl.progress(1);
      else addEventListener("ora:ready", go, { once: true });

      // ---------- geometry ----------
      // The scene is a 16:9 box covering the viewport, so film-relative % positions are exact.
      const box = () => {
        const w = Math.max(innerWidth, innerHeight * (16 / 9));
        return {
          w,
          h: w * (9 / 16),
          left: (innerWidth - w) / 2,
          top: (innerHeight - w * (9 / 16)) / 2,
        };
      };
      const phoneCx = () => innerWidth * (isMobile() ? 0.5 : 0.6);
      const phoneCy = () => innerHeight * (isMobile() ? 0.6 : 0.52);
      const glassW = () => APP_W * phoneScale();
      const glassH = () => APP_H * phoneScale();
      // scale/offset that lands the film's phone glass exactly on the app phone's glass
      const dive = () => {
        const b = box();
        // match heights: the film phone is a touch wider than the app phone, height reads as the truer lock
        const sh = FILM_SCREEN.h * b.h;
        const k = glassH() / sh;
        const cx = (FILM_SCREEN.x + FILM_SCREEN.w / 2) * b.w;
        const cy = (FILM_SCREEN.y + FILM_SCREEN.h / 2) * b.h;
        return {
          k,
          x: phoneCx() - b.left - k * cx,
          y: phoneCy() - b.top - k * cy,
        };
      };

      const f = (i: number) => i / (STORY.frames - 1);
      const tapAt = (
        p: { left: number; top: number },
        label: string,
        pos?: string | number,
      ) => {
        tl.set(ring, { left: p.left, top: p.top }, pos)
          .fromTo(
            ring,
            { autoAlpha: 0, scale: 1.7 },
            { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" },
          )
          .addLabel(label)
          .to(ring, { autoAlpha: 0, scale: 0.7, duration: 0.25 });
      };
      const fade = (
        from: HTMLElement,
        to: HTMLElement,
        pos?: string | number,
        dur = 0.5,
        slide = 0,
      ) =>
        tl
          .fromTo(
            to,
            { autoAlpha: 0, y: slide },
            { autoAlpha: 1, y: 0, duration: dur, ease: "power2.inOut" },
            pos,
          )
          .to(
            from,
            { autoAlpha: 0, y: -slide, duration: dur, ease: "power2.inOut" },
            "<",
          );
      // brand palette per chapter (Figma "Colors"): beige base, light green / light yellow accents
      const TINT = [
        "#FDF4E2",
        "#ABBD94",
        "#ABBD94",
        "#FCDDA1",
        "#C7DEEF", // review: the app's own Cleaning blue
        "#ABBD94",
        "#FDF4E2", // on the way: back to the warm beige of the home
      ];
      const chapterBg = q(".jr__chapterbg")[0];
      const appUi = q(".jr__app-ui")[0];
      // one glass card for the whole app act: it resizes to each chapter while the text swaps
      const rectOf = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const c = appUi.getBoundingClientRect();
        const y = Number(gsap.getProperty(el, "y")) || 0;
        return { left: r.left - c.left, top: r.top - c.top - y, width: r.width, height: r.height };
      };
      const chapter = (i: number, pos?: string | number) => {
        tl.to(
          q(".jr__tint")[0],
          { backgroundColor: TINT[i], duration: 1, ease: "sine.inOut" },
          pos,
        );
        const geo = {
          left: () => rectOf(chapters[i]).left,
          top: () => rectOf(chapters[i]).top,
          width: () => rectOf(chapters[i]).width,
          height: () => rectOf(chapters[i]).height,
        };
        if (i === 0) tl.fromTo(chapterBg, { autoAlpha: 0, ...geo }, { autoAlpha: 1, duration: 0.6 }, pos);
        else tl.to(chapterBg, { ...geo, duration: 0.7, ease: "power3.inOut" }, pos);
        if (i > 0)
          tl.to(
            chapters[i - 1],
            { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in" },
            pos,
          );
        tl.fromTo(
          chapters[i],
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" },
          i > 0 ? ">" : pos,
        ).call(() =>
          q(".jr__dots i").forEach((d, k) =>
            d.classList.toggle("is-on", k === i),
          ),
        );
      };

      const pan = () => {
        if (!isMobile()) return 0;
        const b = box();
        return (
          innerWidth / 2 - (b.left + (FILM_SCREEN.x + FILM_SCREEN.w / 2) * b.w)
        );
      };
      const markAt = () => {
        const b = box();
        return {
          left: b.left + pan() + (FILM_SCREEN.x + FILM_SCREEN.w / 2) * b.w,
          top: b.top + (FILM_SCREEN.y + FILM_SCREEN.h / 2) * b.h,
        };
      };
      gsap.set(screens.slice(1), { autoAlpha: 0 });
      gsap.set([phoneWrap, env, filmScreen, q(".jr__app-ui")[0]], {
        autoAlpha: 0,
      });

      // zoom the film toward a point of the frame (fractions of the 16:9 box), origin 0 0
      const zoomTo = (px: number, py: number, k: number) => {
        const b = box();
        return { scale: k, x: (1 - k) * px * b.w, y: (1 - k) * py * b.h };
      };
      gsap.set([tapFrame, finger, splashB], { autoAlpha: 0 });
      gsap.set(splashA, {
        clipPath: "inset(12.3% 76.8% 79.8% 5.9% round 22%)",
      });

      // scroll length follows the story itself: every timeline unit gets the same stretch of scroll
      // (measured once the timeline is built, then the triggers refresh)
      let units = 70;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * units * UNIT_VH}`,
          pin: true,
          anticipatePin: 1,
          // a soft catch-up on top of Lenis: the camera glides to where you scrolled instead of snapping
          scrub: reduce ? true : 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) =>
            gsap.set(q(".jr__progress i"), { scaleX: self.progress }),
        },
        onUpdate: () => {
          lastScrub = performance.now();
          seq.draw(state.frame);
          if (tl.time() > (tl.labels.leak ?? 1e9)) loadClips();
          techSeq.draw(state.tech);
          acceptSeq.draw(state.accept);
          rideSeq.draw(state.ride);
        },
      });

      // ===== −1 · the Ora mark: turn to face us, fly through its square centre into the sky =====
      const LOGO = 3.4;
      const logoState = { p: 0 };
      tl.addLabel("logo", 0)
        .to(
          logoState,
          {
            p: 1,
            duration: LOGO,
            ease: "none",
            onUpdate: () => {
              logo?.setProgress(logoState.p);
              document.documentElement.classList.toggle("on-mark", logoState.p < 0.97);
            },
          },
          "logo",
        )
        .to(q(".jr__logocue"), { autoAlpha: 0, y: 10, duration: 0.5 }, "logo")
        .set(q(".jr__logo3d"), { autoAlpha: 0 }, `logo+=${LOGO}`)
        // the headline arrives on the clouds as we come through
        .addLabel("hero", `logo+=${LOGO - 0.4}`)
        .fromTo(
          q(".jr__hero .line > span"),
          { yPercent: 115 },
          { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.08 },
          "hero",
        )
        .fromTo(
          q(".jr__hero .eyebrow, .jr__hero p:not(.jr__title), .jr__cta > *, .jr__stats > *"),
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 },
          "hero+=0.2",
        )
        .to({}, { duration: 1.3 }); // a beat on the clouds before the fall

      // ===== 0 · fall through the clouds =====
      // One scene, one camera: the live film sits inside a real opening in the cloud layer from the
      // first frame. Falling = the film zooming up to full screen around the opening while the
      // clouds (nearer the camera) rush outward faster. Nothing crossfades, so it never cuts.
      const SKY = 4.6;
      const deck = q<HTMLImageElement>(".jr__deck")[0];
      const HOLE = { x: 0.49, y: 0.653, w: 0.445, h: 0.375 }; // opening in clouds.webp (fractions)
      const POS = { x: 0.5, y: 0.6 }; // object-position of the deck
      const hole = () => {
        const iw = deck.naturalWidth || 2560;
        const ih = deck.naturalHeight || 1429;
        const k = Math.max(innerWidth / iw, innerHeight / ih);
        return {
          x: (innerWidth - iw * k) * POS.x + HOLE.x * iw * k,
          y: (innerHeight - ih * k) * POS.y + HOLE.y * ih * k,
          w: HOLE.w * iw * k,
          h: HOLE.h * ih * k,
        };
      };
      // film scale at rest: a little larger than the opening, so its edges stay under the clouds
      const s0 = () => {
        const b = box();
        const h = hole();
        return Math.min(0.9, Math.max((h.w * 1.3) / b.w, (h.h * 1.3) / b.h));
      };
      const fall = { k: 0 }; // 0 = at rest in the sky, 1 = film full screen
      const applyFall = () => {
        const b = box();
        const h = hole();
        const start = s0();
        const k = start + (1 - start) * fall.k;
        const z = zoomTo((h.x - b.left) / b.w, (h.y - b.top) / b.h, k);
        gsap.set(scene, { scale: z.scale, x: z.x, y: z.y, force3D: false });
        deck.style.transformOrigin = `${h.x}px ${h.y}px`;
        const c = Math.pow(k / start, 1.8);
        gsap.set(deck, { scaleX: c, scaleY: c });
      };
      applyFall();
      addEventListener("resize", applyFall);
      deck.addEventListener("load", applyFall);
      tl.addLabel("sky")
        .to(q(".jr__hero"), { autoAlpha: 0, y: -70, duration: 1.4, ease: "power1.in" }, "sky")
        .to(q(".jr__stats"), { autoAlpha: 0, y: 30, duration: 0.9 }, "sky")
        .to(fall, { k: 1, duration: SKY, ease: "power2.inOut", onUpdate: applyFall }, "sky")
        .set(q(".jr__deck"), { autoAlpha: 0 }, `sky+=${SKY}`);
      q<HTMLElement>(".jr__puff").forEach((img) => {
        const d = Number(img.dataset.d);
        const w = img.parentElement!;
        // fly outward from the screen centre, faster the nearer the cloud
        const cx = () => (w.offsetLeft + w.offsetWidth / 2) / innerWidth - 0.5;
        const cy = () => (w.offsetTop + w.offsetHeight / 2) / innerHeight - 0.5;
        tl.to(
          img,
          {
            x: () => cx() * innerWidth * 1.6 * d,
            y: () => cy() * innerHeight * 1.6 * d,
            scaleX: 1 + 2.4 * d,
            scaleY: 1 + 2.4 * d,
            duration: SKY * (0.7 + 0.2 / d),
            ease: "power2.in",
          },
          "sky",
        ).to(img, { autoAlpha: 0, duration: 0.8 }, `sky+=${SKY * 0.6}`);
      });
      tl.set(q(".jr__sky"), { autoAlpha: 0 }, `sky+=${SKY + 0.1}`);

      // ===== 1 · the flight (frames 0 → aerialEnd) =====
      tl.addLabel("fly", `sky+=${SKY * 0.45}`)
        .to(
          state,
          { frame: f(STORY.aerialEnd), duration: 8, ease: "sine.inOut" },
          "fly",
        )

        // ===== 2 · through the door, the leak =====
        .addLabel("leak")
        .to(
          state,
          { frame: f(STORY.leakEnd), duration: 9.5, ease: "sine.inOut" },
          "leak",
        )

        // ===== 2b · push in on the leak: the water keeps flowing even when you stop scrolling =====
        .addLabel("water")
        .to(
          scene,
          {
            ...{ duration: 1.6, ease: "power2.in" },
            force3D: false,
            scale: () => zoomTo(0.5, 0.42, 1.7).scale,
            x: () => zoomTo(0.5, 0.42, 1.7).x,
            y: () => zoomTo(0.5, 0.42, 1.7).y,
          },
          "water",
        )
        .fromTo(
          q(".jr__cap--leak"),
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "water+=1.3",
        )
        .to(
          q(".jr__cap--leak"),
          { autoAlpha: 0, y: -30, duration: 0.6 },
          "water+=3.6",
        )
        .to(
          scene,
          { scale: 1, x: 0, y: 0, duration: 1.2, ease: "power2.out", force3D: false },
          "water+=3.9",
        )

        // ===== 3 · he lifts his phone =====
        .addLabel("lift", "water+=4.6")
        .to(scene, { x: pan, duration: 3, ease: "sine.inOut", force3D: false }, "lift")
        .to(state, { frame: 1, duration: 4, ease: "sine.inOut" }, "lift")
        .fromTo(
          q(".jr__cap--lift"),
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "lift+=1.8",
        )

        // ===== 4 · the screen wakes: Ora splash, 3D mark =====
        .addLabel("wake")
        .to(filmScreen, { autoAlpha: 1, duration: 0.5 }, "wake")
        // his finger comes in and taps the Ora icon (Figma "Start Screen - iOS Launch Icon")
        .to(
          [tapFrame, finger],
          { autoAlpha: 1, duration: 0.6, ease: "power2.out" },
          "wake+=0.6",
        )
        .fromTo(
          iosIcon,
          { scale: 1 },
          { scale: 0.985, duration: 0.15, transformOrigin: "15% 16%" },
          "wake+=1.2",
        )
        // the icon grows into the Ora splash (Figma "Landing Screen - 01 A")
        .to(
          splashA,
          {
            clipPath: "inset(0% 0% 0% 0% round 0%)",
            duration: 1,
            ease: "expo.inOut",
          },
          "wake+=1.35",
        )
        .to(
          [tapFrame, finger],
          { autoAlpha: 0, duration: 0.7, ease: "power2.in" },
          "wake+=1.7",
        )
        // then the palm splash (01 B)
        .to(
          splashA,
          { yPercent: 4.7, duration: 0.45, ease: "power2.inOut" },
          "wake+=2.4",
        )
        .to(splashB, { autoAlpha: 1, duration: 0.45 }, "wake+=2.85")
        .set(
          q(".jr__mark3d"),
          { left: () => markAt().left, top: () => markAt().top },
          "wake",
        )
        .fromTo(
          q(".jr__mark3d"),
          { autoAlpha: 0, scale: 0.3, rotateY: -120, rotateX: 30, z: -200 },
          {
            autoAlpha: 1,
            scale: 1,
            rotateY: 0,
            rotateX: 0,
            z: 0,
            duration: 1.4,
            ease: "expo.out",
          },
          "wake+=2.9",
        )
        .to(
          q(".jr__mark3d"),
          {
            rotateY: 180,
            scale: 1.4,
            autoAlpha: 0,
            duration: 1,
            ease: "power2.in",
          },
          "wake+=4.4",
        )
        .to(
          q(".jr__cap--lift"),
          { autoAlpha: 0, y: -30, duration: 0.5 },
          "wake+=4.2",
        )

        // ===== 5 · dive into the screen — the film phone becomes the app phone =====
        .addLabel("dive")
        .to(
          scene,
          {
            scale: () => dive().k,
            x: () => dive().x,
            y: () => dive().y,
            // 2D transform: the scene re-rasterises at its zoomed size instead of stretching a 1× bitmap
            force3D: false,
            duration: 2.2,
            ease: "power3.inOut",
          },
          "dive",
        )
        .fromTo(q(".jr__soft"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.3, ease: "power1.inOut" }, "dive+=0.8")
        .to(
          q(".jr__tint"),
          { autoAlpha: 0.62, duration: 1.4, ease: "power2.inOut" },
          "dive+=1.6",
        )
        .to(phoneWrap, { autoAlpha: 1, duration: 0.5 }, "dive+=1.8")
        .set(canvas, { autoAlpha: 0 }, "dive+=2.2")
        // the film's own phone screen sits right behind the app phone: gone before the device ever turns
        .set(filmScreen, { autoAlpha: 0 }, "dive+=2.2")
        .to(q(".jr__app-ui"), { autoAlpha: 1, duration: 0.6 }, "dive+=2.1")

        // ===== 6 · the app, one frame, the UI changes =====
        .addLabel("app")
        .to(q(".jr__glow"), { autoAlpha: 1, duration: 1 }, "app");
      chapter(0, "app");
      // the app opens from its logo: Services is revealed by a crisp circle, never a see-through blend
      tl.fromTo(
        byName("home"),
        { autoAlpha: 1, clipPath: "circle(0% at 50% 47%)" },
        { clipPath: "circle(120% at 50% 47%)", duration: 0.9, ease: "power3.inOut" },
        "app+=0.3",
      ).set(byName("splash-c"), { autoAlpha: 0 }, "app+=1.25").fromTo(
        byName("home"),
        { scale: 0.97 },
        { scale: 1, duration: 0.8, ease: "power3.out" },
        "app+=0.3",
      );
      tiles.forEach((t, i) => {
        const d = Number(t.dataset.d);
        tl.fromTo(
          t,
          { x: 0, y: 0, z: -300, scale: 0.4, autoAlpha: 0 },
          {
            x: () =>
              Number(t.dataset.x) * glassW() * (isMobile() ? 0.62 : 1.25),
            y: () => Number(t.dataset.y) * glassH(),
            z: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 1.1,
            ease: "expo.out",
          },
          `app+=${0.6 + i * 0.1}`,
        );
        tl.to(t, { y: `-=${50 * d}`, duration: 2.4 }, "app+=1.6");
      });

      tl.fromTo(
        cardsIn,
        { y: 60, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          stagger: 0.07,
          ease: "power3.out",
        },
        "app+=0.6",
      )
        .to(
          listInner,
          { y: -528, duration: 2.6, ease: "power1.inOut" },
          "app+=1.9",
        )
        .to(
          listInner,
          { y: -300, duration: 1.1, ease: "power2.inOut" },
          "app+=4.6",
        );

      // ---------- 3D device choreography ----------
      const phone = q<HTMLElement>(".jr__phone .phone")[0];
      const pick = q(".jr__pick")[0];
      const pickCheck = q(".jr__pickcheck")[0];
      const dim = q(".jr__dim")[0];
      const popDate = q(".jr__popcard--date")[0];
      const popDone = q(".jr__popcard--done")[0];
      // 3D offsets live in GSAP (it folds CSS `translate` into its own transform and would drop them):
      // the pick badge floats above the card, the seal in front of the glass, the technician card a
      // little behind the device (scale compensates) so the two never intersect when they turn.
      gsap.set(pickCheck, { z: 140 });
      gsap.set(q(".jr__seal"), { xPercent: -50, yPercent: -50, z: 90 });
      gsap.set(techCard, { z: -60, scale: TECH_Z });
      const insetOf = (r: { x: number; y: number; w: number; h: number }, round: number) =>
        `inset(${r.y}px ${APP_W - r.x - r.w}px ${APP_H - r.y - r.h}px ${r.x}px round ${round}px)`;

      // ===== Plumbing: the card lifts off the list toward you (selected), then opens into its screen =====
      tl.addLabel("plumb", "app+=5.8");
      tapAt(TAPS.plumbing, "tapPlumb", "plumb");
      tl.to(
        tiles,
        {
          autoAlpha: 0,
          scale: 0.6,
          z: -200,
          duration: 0.6,
          stagger: 0.04,
          ease: "power2.in",
        },
        "tapPlumb",
      )
        .set(pick, { autoAlpha: 1 }, "tapPlumb")
        .to(dim, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, "tapPlumb")
        .fromTo(
          pick,
          { z: 0, y: 0, scale: 1, rotateX: 0 },
          { z: 120, y: -16, scale: 1.1, rotateX: -10, duration: 0.8, ease: "back.out(1.5)", immediateRender: false },
          "tapPlumb",
        )
        .to(phone, { rotateY: -12, rotateX: 5, duration: 1.3, ease: "sine.inOut" }, "tapPlumb")
        .fromTo(
          pickCheck,
          { autoAlpha: 0, scale: 0 },
          { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)", immediateRender: false },
          "tapPlumb+=0.35",
        )
        .fromTo(
          q(".jr__pickcheck path"),
          { strokeDashoffset: 30 },
          { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" },
          "tapPlumb+=0.55",
        )
        .addLabel("openPlumb", "tapPlumb+=1.6")
        .to(pick, { z: 0, y: 0, scale: 1, rotateX: 0, duration: 0.5, ease: "power2.inOut" }, "openPlumb")
        .to(pickCheck, { autoAlpha: 0, scale: 0.6, duration: 0.3 }, "openPlumb")
        .to(phone, { rotateY: 0, rotateX: 0, duration: 1.1, ease: "power2.inOut" }, "openPlumb")
        // the Plumbing screen grows out of the selected card (crisp clip, never a see-through blend)
        .set(byName("plumbing-open"), { autoAlpha: 1 }, "openPlumb+=0.45")
        .fromTo(
          byName("plumbing-open"),
          { clipPath: insetOf(POP.plumbing, 20) },
          { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.9, ease: "expo.inOut", immediateRender: false },
          "openPlumb+=0.45",
        )
        .to(pick, { autoAlpha: 0, duration: 0.25 }, "openPlumb+=0.55")
        .set([byName("home"), dim], { autoAlpha: 0 }, "openPlumb+=1.4");
      chapter(1, "openPlumb+=0.3");
      tapAt(TAPS.fixture, "tapFix", "openPlumb+=1.9");
      fade(byName("plumbing-open"), byName("plumbing-picked"), "tapFix", 0.3);

      // ===== Date: the booking card flies in from in front of the glass and lands on the screen =====
      tl.addLabel("date", "tapFix+=0.9");
      fade(byName("plumbing-picked"), byName("date-base"), "date", 0.45);
      chapter(2, "date+=0.2");
      tl.to(phone, { rotateY: 10, rotateX: 4, duration: 1.3, ease: "sine.inOut" }, "date")
        .fromTo(
          popDate,
          { autoAlpha: 0, z: 460, y: 190, rotateX: 42, scale: 0.92 },
          { autoAlpha: 1, z: 0, y: 0, rotateX: 0, scale: 1, duration: 1.3, ease: "expo.out", immediateRender: false },
          "date+=0.25",
        )
        // landed: the full screen takes over pixel for pixel
        .set(byName("date"), { autoAlpha: 1 }, "date+=1.6")
        .set(popDate, { autoAlpha: 0 }, "date+=1.6")
        .set(byName("date-base"), { autoAlpha: 0 }, "date+=1.7")
        .to(phone, { rotateY: 0, rotateX: 0, duration: 1, ease: "sine.inOut" }, "date+=1.4");
      tapAt(TAPS.slot, "tapSlot", "date+=1.9");
      tapAt(TAPS.select, "tapSelect", "tapSlot+=0.4");

      // ===== Technician: the device flips on its edge and turns back as a window onto him =====
      tl.addLabel("tech", "tapSelect+=0.6");
      chapter(3, "tech+=0.3");
      tl.to(phone, { rotateY: 90, duration: 0.55, ease: "power2.in" }, "tech")
        .set(techPhoto, { autoAlpha: 1 }, "tech+=0.55")
        .set(byName("date"), { autoAlpha: 0 }, "tech+=0.55")
        .fromTo(
          phone,
          { rotateY: -90 },
          { rotateY: 0, duration: 0.85, ease: "power3.out", immediateRender: false },
          "tech+=0.55",
        )
        .fromTo(
          techCard,
          { autoAlpha: 0, scale: 0.72 * TECH_Z, rotateY: -10 },
          // on phones the card would be wider than the screen (cut edges): the device alone is the frame
          { autoAlpha: () => (isMobile() ? 0 : 1), scale: TECH_Z, rotateY: 0, duration: 1.2, ease: "expo.out" },
          "tech+=0.9",
        )
        // he looks up, smiles, then folds his arms (Higgsfield clip, same shot and background)
        .to(state, { tech: 1, duration: 3.4, ease: "none" }, "tech+=1.1");
      techCards.forEach((c, i) =>
        tl.fromTo(
          c,
          { autoAlpha: 0, y: 70, z: -120 },
          { autoAlpha: 1, y: 0, z: 0, duration: 0.9, ease: "expo.out" },
          `tech+=${1.6 + i * 0.18}`,
        ),
      );
      tl.to(
        state,
        {
          count: 1,
          duration: 1,
          ease: "power2.out",
          onUpdate: () =>
            q<HTMLElement>("[data-count]").forEach(
              (n) =>
                (n.textContent = (
                  Number(n.dataset.count) * state.count
                ).toFixed(Number(n.dataset.dec || 0))),
            ),
        },
        "tech+=1.8",
      ).to(
        techCards,
        {
          y: (i, t) => -36 * Number((t as HTMLElement).dataset.d || 1),
          duration: 2,
        },
        "tech+=2.8",
      );

      // ===== Review: the photo lifts away, the order cards unfold in 3D, the choices pop =====
      tl.addLabel("review", "tech+=4.9");
      chapter(4, "review");
      tl.to(
        techCards,
        { autoAlpha: 0, y: "-=30", duration: 0.5, stagger: 0.03 },
        "review",
      )
        .to(techCard, { autoAlpha: 0, scale: 0.8 * TECH_Z, rotateY: 8, duration: 0.7 }, "review")
        .set(byName("review"), { autoAlpha: 1 }, "review")
        .fromTo(
          byName("review"),
          { scale: 0.9, transformOrigin: "50% 60%" },
          { scale: 1, duration: 1, ease: "power3.out", immediateRender: false },
          "review+=0.2",
        )
        .to(techPhoto, { yPercent: -100, duration: 0.8, ease: "power3.inOut" }, "review+=0.1")
        .set(techPhoto, { autoAlpha: 0 }, "review+=0.95")
        .to(phone, { rotateY: 8, rotateX: 3, duration: 1.4, ease: "sine.inOut" }, "review");
      tl.fromTo(
        rvCards,
        { autoAlpha: 0, rotateX: -75, z: -140, y: 60, transformPerspective: 900, transformOrigin: "50% 0%" },
        { autoAlpha: 1, rotateX: 0, z: 0, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.1 },
        "review+=0.7",
      );
      const popCard = (k: number, at: string) =>
        tl
          .to(
            rvCards[k],
            {
              scale: 1.08,
              z: 30,
              filter: "drop-shadow(0px 14px 18px rgba(71,21,15,0.28))",
              duration: 0.3,
              ease: "power2.out",
            },
            at,
          )
          .to(
            rvCards[k],
            {
              scale: 1,
              z: 0,
              filter: "drop-shadow(0px 0px 0px rgba(71,21,15,0))",
              duration: 0.4,
              ease: "power2.inOut",
            },
            ">",
          );
      // the selections the customer made: service, day, slot…
      [0, 1, 2].forEach((k, i) => popCard(k, `review+=${2 + i * 0.28}`));
      tl.fromTo(
        q(".jr__rv-inner"),
        { y: 0 },
        { y: -RV_SCROLL, duration: 1.5, ease: "power2.inOut" },
        "review+=3.1",
      );
      // …then address and the special request once they scroll into view
      popCard(4, "review+=4.5");
      popCard(7, "review+=4.78");
      tapAt(TAPS.confirm, "tapConfirm", "review+=5.4");

      // ===== Confirmed: the card lands in 3D, a seal and brand confetti burst around the device =====
      tl.addLabel("done", "tapConfirm+=0.3");
      chapter(5, "done");
      const confetti = q<HTMLElement>(".jr__confetti i");
      tl.to(phone, { rotateY: 0, rotateX: 0, duration: 1, ease: "power3.inOut" }, "done")
        .fromTo(
          byName("confirmed-base"),
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.5, ease: "power2.inOut" },
          "done+=0.1",
        )
        .fromTo(
          popDone,
          { autoAlpha: 0, z: 520, y: 150, rotateX: -34, scale: 0.84 },
          { autoAlpha: 1, z: 0, y: 0, rotateX: 0, scale: 1, duration: 1.3, ease: "expo.out", immediateRender: false },
          "done+=0.35",
        )
        .set(byName("confirmed"), { autoAlpha: 1 }, "done+=1.7")
        .set(popDone, { autoAlpha: 0 }, "done+=1.7")
        .fromTo(
          q(".jr__seal"),
          { autoAlpha: 0, scale: 0.2, z: 290 },
          { autoAlpha: 1, scale: 1, z: 90, duration: 0.7, ease: "back.out(1.8)", immediateRender: false },
          "done+=1.1",
        )
        .fromTo(
          q(".jr__seal path"),
          { strokeDashoffset: 60 },
          { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" },
          "done+=1.45",
        )
        .fromTo(
          confetti,
          { x: 0, y: 0, scale: 0, rotate: 0, autoAlpha: 1 },
          {
            x: (i) => Math.cos((CONFETTI[i].a * Math.PI) / 180) * CONFETTI[i].r * glassH(),
            y: (i) => Math.sin((CONFETTI[i].a * Math.PI) / 180) * CONFETTI[i].r * glassH() * 0.8,
            scale: (i) => CONFETTI[i].s,
            rotate: (i) => (i % 2 ? 1 : -1) * (160 + i * 23),
            duration: 1.6,
            ease: "expo.out",
            immediateRender: false,
          },
          "done+=1.2",
        )
        .to(confetti, { autoAlpha: 0, y: "+=40", duration: 0.7, ease: "power1.in" }, "done+=2.3")
        .fromTo(
          q(".jr__pulse"),
          { scale: 0.5, autoAlpha: 0.7 },
          {
            scale: 2.6,
            autoAlpha: 0,
            duration: 1.8,
            stagger: 0.25,
            ease: "power1.out",
            // don't paint the start state at load: the rings exist only at the confirmation beat
            immediateRender: false,
          },
          "done+=1.2",
        )
        .to(q(".jr__seal"), { autoAlpha: 0, scale: 0.7, y: -40, duration: 0.5, ease: "power2.in" }, "done+=2.7");

      // ===== On the way: the 3D technician gets the job, accepts, and rides off with his tools =====
      tl.addLabel("accept", "done+=3.3");
      chapter(6, "accept");
      const av = q(".jr__av")[0];
      const notif = q(".jr__notif")[0];
      const ride = q<HTMLElement>(".jr__ride")[0];
      const AV = 3.6; // scroll units for the accept clip
      gsap.set(ride, { xPercent: -50, yPercent: -50 });
      if (isMobile()) gsap.set(av, { xPercent: -50 });
      tl.to(
        phoneWrap,
        {
          x: () => (isMobile() ? 0 : -innerWidth * 0.07),
          scale: () => (isMobile() ? 0.8 : 0.86),
          autoAlpha: () => (isMobile() ? 0 : 1),
          duration: 1.2,
          ease: "power3.inOut",
        },
        "accept",
      )
        .to(phone, { rotateY: 14, duration: 1.2, ease: "power3.inOut" }, "accept")
        .fromTo(
          av,
          { autoAlpha: 0, x: 80, scale: 0.94 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 1, ease: "expo.out" },
          "accept+=0.4",
        )
        .to(state, { accept: 1, duration: AV, ease: "none" }, "accept+=0.6")
        // the job notification pops from his phone (fully in before the clip's own pill appears)
        .fromTo(
          notif,
          { autoAlpha: 0, scale: 0.6, y: 24 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.2, ease: "back.out(2)" },
          `accept+=${0.6 + AV * 0.58}`,
        )
        .to(q(".jr__notif b"), { scale: 0.9, duration: 0.12 }, `accept+=${0.7 + AV}`)
        .to(q(".jr__notif b"), { scale: 1, duration: 0.2 }, ">")
        .to(q(".jr__notif .is-idle"), { autoAlpha: 0, duration: 0.15 }, `accept+=${0.8 + AV}`)
        .fromTo(q(".jr__notif .is-done"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, `accept+=${0.85 + AV}`)
        .to(q(".jr__notif b"), { backgroundColor: "#2f5a26", duration: 0.3 }, `accept+=${0.8 + AV}`);

      tl.addLabel("ride", `accept+=${1.6 + AV}`);
      tl.to(av, { autoAlpha: 0, scale: 0.92, duration: 0.5, ease: "power2.in" }, "ride")
        .to(notif, { autoAlpha: 0, y: -30, duration: 0.4, ease: "power2.in" }, "ride+=0.3")
        .to(phoneWrap, { autoAlpha: 0, y: 40, duration: 0.8, ease: "power2.in" }, "ride")
        .fromTo(
          ride,
          // enters large from the right, rides away up the frame into the distance
          { autoAlpha: 1, x: () => innerWidth * 0.5 + ride.offsetWidth * 0.5, y: () => innerHeight * 0.08, scale: 1.08 },
          {
            // ends small, up the road and clear of the chapter card, fading into the haze
            x: () => -innerWidth * (isMobile() ? 0 : 0.06),
            y: () => -innerHeight * (isMobile() ? 0.02 : 0.12),
            scale: 0.42,
            duration: 5.2,
            ease: "power1.out",
            immediateRender: false,
          },
          "ride+=0.2",
        )
        .to(ride, { autoAlpha: 0, duration: 1.4, ease: "power1.in" }, "ride+=4")
        .to(state, { ride: 1, duration: 5.2, ease: "none" }, "ride+=0.2")
        .to({}, { duration: 0.3 });

      units = tl.duration();
      ScrollTrigger.refresh();
      // audit hook: continuity/contrast scripts seek to story beats by label
      (window as unknown as { __oraJourney?: gsap.core.Timeline }).__oraJourney = tl;

      // Idle water: paused on the leak close-up, ping-pong the film's own last leak frames so the
      // water keeps running. Same shot, same framing — nothing is layered on top.
      const idle = () => {
        const t = tl.time();
        const w0 = tl.labels.water;
        if (!reduce && t > w0 + 0.3 && t < w0 + 3.9 && performance.now() - lastScrub > 140) {
          const span = 10; // frames
          const ph = (performance.now() / 1000) * 8; // 8 fps, gentle
          const tri = Math.abs((ph % (2 * span)) - span); // span…0…span
          seq.draw(f(STORY.leakEnd - tri));
        }
      };
      gsap.ticker.add(idle);

      return () => {
        clearTimeout(clipTimer);
        removeEventListener("ora:ready", go);
        removeEventListener("resize", applyFall);
        gsap.ticker.remove(idle);
      };
    }, el);

    return () => {
      ctx.revert();
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onLogoPointer);
      removeEventListener("resize", onLogoResize);
      logoGone = true;
      logo?.dispose();
    };
  }, []);

  return (
    <section
      className="jr"
      id="journey"
      ref={root}
      data-header="light"
      aria-label="Ora, from a leak to a booked plumber"
    >
      {/* ---------- the film ---------- */}
      <div className="jr__scene">
        <canvas className="jr__canvas" />
        {/* the last film frame, pre-blurred: the dive into the phone is a focus pull on the same shot */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="jr__soft" src="/img/story-soft.webp" alt="" aria-hidden decoding="async" fetchPriority="low" />
        <div
          className="jr__filmscreen"
          style={{
            left: `${FILM_SCREEN.x * 100}%`,
            top: `${FILM_SCREEN.y * 100}%`,
            width: `${FILM_SCREEN.w * 100}%`,
            height: `${FILM_SCREEN.h * 100}%`,
          }}
        >
          {/* Figma launch sequence: iOS home with the Ora icon → 01 A → 01 B */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async"
            className="jr__fs jr__fs--icon"
            src="/app/ios-icon.webp"
            alt=""
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async" className="jr__fs jr__fs--a" src="/app/splash-a.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async" className="jr__fs jr__fs--b" src="/app/splash-b.webp" alt="" />
        </div>
        {/* the tapping hand: film frame behind, fingertip cut-out over the live screen */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img fetchPriority="low" decoding="async"
          className="jr__tapframe"
          src="/img/tap-frame.webp"
          alt=""
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img fetchPriority="low" decoding="async"
          className="jr__finger"
          src="/img/tap-finger.webp"
          alt=""
          aria-hidden
          style={{
            left: `${FILM_SCREEN.x * 100}%`,
            top: `${FILM_SCREEN.y * 100}%`,
            width: `${FILM_SCREEN.w * 100}%`,
            height: `${FILM_SCREEN.h * 100}%`,
          }}
        />
      </div>
      <div className="jr__env" aria-hidden />
      <div className="jr__tint" aria-hidden />
      <div className="jr__shade" aria-hidden />

      {/* 3D Ora mark that bursts out of the phone */}
      <div className="jr__mark3d" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              transform: `translateZ(${-i * 4}px)`,
              opacity: 1 - i * 0.12,
            }}
          >
            <Mark />
          </span>
        ))}
      </div>

      {/* ---------- opening sky: fall through the clouds into the villa community ---------- */}
      <div className="jr__sky" aria-hidden>
        <picture>
          <source media="(max-width: 860px)" srcSet="/img/sky/clouds-m.webp" />
          <img className="jr__deck" src="/img/sky/clouds.webp" alt="" fetchPriority="high" />
        </picture>
        {PUFFS.map((pf) => (
          <span
            key={pf.n}
            className="jr__puffw"
            style={{ left: `${pf.x}%`, top: `${pf.y}%`, width: `${pf.w}vw` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="jr__puff" data-d={pf.d} src={`/img/sky/puff-${pf.n}.webp`} alt="" decoding="async" />
          </span>
        ))}
      </div>

      {/* ---------- the first screen: the Ora mark in 3D, and the portal into the story ---------- */}
      <canvas className="jr__logo3d" aria-hidden />
      <div className="jr__logocue" aria-hidden>
        <span>Scroll to enter</span>
        <i />
      </div>

      {/* ---------- film captions ---------- */}
      <div className="jr__hero">
        <span className="eyebrow">
          <Mark /> Dubai&apos;s in-house home maintenance
        </span>
        <p className="display jr__title">
          <Lines>{["Home maintenance,", "done <em>properly.</em>"]}</Lines>
        </p>
        <p>
          In-house teams for apartments and villas. On-time slots, transparent
          work, clear pricing and a job report after every visit.
        </p>
        <div className="jr__cta">
          <a className="btn" href="#download" data-magnetic>
            Get the app
          </a>
          <a className="btn btn--ghost" href="#services">
            Explore services
          </a>
        </div>
      </div>
      <div className="jr__stats">
        <span className="glass">
          <b>500+</b> jobs booked
        </span>
        <span className="glass">
          <b>25+</b> awards &amp; honors
        </span>
        <span className="glass">
          <b>4.9★</b> average rating
        </span>
      </div>
      <div className="jr__cap jr__cap--leak glass">
        <span className="eyebrow">
          <Mark /> 7:40 am · Al Barsha
        </span>
        <h2 className="display">A leak before breakfast.</h2>
        <p>No calls, no hold music, no guessing who will turn up.</p>
      </div>
      <div className="jr__cap jr__cap--lift glass">
        <span className="eyebrow">
          <Mark /> He opens Ora
        </span>
        <h2 className="display">Three taps to a plumber.</h2>
      </div>

      {/* ---------- the app ---------- */}
      <div className="jr__glow" aria-hidden />
      <div className="jr__phone">
        <span className="jr__pulse" aria-hidden />
        <span className="jr__pulse" aria-hidden />
        <span className="jr__pulse" aria-hidden />

        {/* photo card behind the phone (same shot, same scale as the in-phone photo); the still is the
            poster, the canvas plays his smile and folded arms over it */}
        <div className="jr__techcard" aria-hidden>
          <canvas className="jr__techcv jr__techcv--card" />
        </div>

        {/* confirmation: seal and brand confetti around the device */}
        <span className="jr__confetti" aria-hidden>
          {CONFETTI.map((c, i) => (
            <i key={i} style={{ background: c.c, borderRadius: i % 3 ? 2 : 999 }} />
          ))}
        </span>

        <Phone
          pop={
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="jr__pick"
                src="/app/svc-card-5.webp"
                alt=""
                decoding="async"
                style={{ left: POP.plumbing.x, top: POP.plumbing.y, width: POP.plumbing.w }}
              />
              <span
                className="jr__pickcheck"
                style={{ left: POP.plumbing.x + POP.plumbing.w - 22, top: POP.plumbing.y - 14 }}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 12.5l4 4 8-9" pathLength={30} />
                </svg>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="jr__popcard jr__popcard--date"
                src="/app/date-card.webp"
                alt=""
                decoding="async"
                fetchPriority="low"
                style={{ left: POP.date.x, top: POP.date.y, width: POP.date.w, height: POP.date.h }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="jr__popcard jr__popcard--done"
                src="/app/confirmed-card.webp"
                alt=""
                decoding="async"
                fetchPriority="low"
                style={{
                  left: POP.confirmed.x,
                  top: POP.confirmed.y,
                  width: POP.confirmed.w,
                  height: POP.confirmed.h,
                }}
              />
            </>
          }
        >
          {SCREENS.map((s) =>
            s === "home" ? (
              // Services home: Figma background + the nine exact service cards as a live list
              <div key={s} className="jr__scr jr__home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img fetchPriority="low" decoding="async" src="/app/home-base.webp" alt="" />
                <div className="jr__list">
                  <div className="jr__list-inner">
                    {Array.from({ length: 9 }, (_, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img fetchPriority="low" decoding="async"
                        key={i}
                        className="jr__card"
                        src={`/app/svc-card-${i + 1}.webp`}
                        alt=""
                        style={{ top: i * 132 - 3 }}
                      />
                    ))}
                  </div>
                </div>
                <span className="jr__dim" aria-hidden />
              </div>
            ) : s === "review" ? (
              // Review your order: Figma base + the order cards, live inside the glass panel
              <div key={s} className="jr__scr jr__review">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img fetchPriority="low" decoding="async" src="/app/review-base.webp" alt="" />
                <div className="jr__rv">
                  <div className="jr__rv-inner">
                    {RV_CARDS.map((c) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img fetchPriority="low" decoding="async"
                        key={c.k}
                        className="jr__rv-card"
                        src={`/app/rv-${c.k}.webp`}
                        alt=""
                        style={{ left: c.x, top: c.y, width: c.w }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img fetchPriority="low" decoding="async" key={s} className="jr__scr" src={`/app/${s}.webp`} alt="" />
            ),
          )}
          <div className="jr__techphoto">
            <canvas className="jr__techcv jr__techcv--phone" />
          </div>
          <span className="jr__ring" aria-hidden />
        </Phone>


        {TILES.map((t) => (
          <div
            className="jr__tile glass"
            key={t.name}
            data-x={t.x}
            data-y={t.y}
            data-d={t.d}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img fetchPriority="low" decoding="async" src={t.src} alt="" />
            <span>{t.name}</span>
          </div>
        ))}

        <span className="jr__seal" aria-hidden>
          <svg viewBox="0 0 48 48">
            <path d="M14 25l7 7 14-15" pathLength={60} />
          </svg>
        </span>

        <div className="jr__box">
          <div
            className="jr__qcard glass"
            data-d="1.3"
            style={{ left: "calc(100% + 44px)", top: "4%" }}
          >
            <i className="jr__tick">✓</i> Background-checked
          </div>
          <div
            className="jr__qcard glass"
            data-d="0.9"
            style={{ left: "calc(100% + 110px)", top: "50%" }}
          >
            <small>Workmanship guarantee</small>
            <b>
              <span data-count="30">0</span> days
            </b>
          </div>
          <div
            className="jr__qcard glass"
            data-d="1.1"
            style={{ left: "calc(100% + 110px)", top: "22%" }}
          >
            <small>Average rating</small>
            <b>
              <span data-count="4.9" data-dec="1">
                0.0
              </span>{" "}
              / 5
            </b>
            <span className="stars">★★★★★</span>
          </div>
          <div
            className="jr__qcard glass glass--dark"
            data-d="1.5"
            style={{ left: "calc(100% + 44px)", top: "74%" }}
          >
            <small>Employment</small>
            <b>On Ora payroll</b>
            <small>Not a marketplace</small>
          </div>
        </div>

      </div>

      {/* ---------- the 3D technician: gets the job, accepts, rides off ---------- */}
      <div className="jr__av" aria-hidden>
        <canvas className="jr__avcv" />
        <div className="jr__notif">
          <span className="jr__notif-icon">
            <Mark />
          </span>
          <span className="jr__notif-text">
            <small>Ora · New job</small>
            <strong>Plumbing · Fixture installation</strong>
            <small>Tue 4 Nov, 13:00 to 15:00</small>
          </span>
          <b>
            <span className="is-idle">Accept</span>
            <span className="is-done">Accepted ✓</span>
          </b>
        </div>
      </div>
      <div className="jr__app-ui">
        <div className="jr__chapterbg glass" aria-hidden />
        {CHAPTERS.map((c) => (
          <div className="jr__chapter jr__chapter--text" key={c.k}>
            <span className="eyebrow">
              <Mark /> {c.k} · {c.eyebrow}
            </span>
            <h2 className="display">
              <Lines>{c.title}</Lines>
            </h2>
            <p>{c.body}</p>
          </div>
        ))}
        <div className="jr__dots" aria-hidden>
          {CHAPTERS.map((c) => (
            <i key={c.k} />
          ))}
        </div>
      </div>

      {/* he rides past in front of everything: the foreground of the last shot */}
      <div className="jr__ride" aria-hidden>
        <span className="jr__ride-shadow" />
        <canvas className="jr__ridecv" />
      </div>

      <div className="jr__progress" aria-hidden>
        <i />
      </div>
    </section>
  );
}
