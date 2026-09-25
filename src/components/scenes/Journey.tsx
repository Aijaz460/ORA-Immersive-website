"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createSequence } from "@/lib/sequence";
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
  "date",
  "review",
  "confirmed",
] as const;

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
    const onResize = () => seq.resize();
    addEventListener("resize", onResize);

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
      const state = { frame: 0, count: 0 };

      // ---------- intro once the preloader lifts ----------
      const introTl = gsap
        .timeline({ paused: true })
        .from(q(".jr__hero .line > span"), {
          yPercent: 115,
          duration: 1.5,
          ease: "expo.out",
          stagger: 0.1,
        })
        .from(
          q(".jr__hero .eyebrow, .jr__hero p, .jr__cta > *, .jr__stats > *"),
          {
            y: 20,
            autoAlpha: 0,
            duration: 1.2,
            ease: "expo.out",
            stagger: 0.06,
          },
          0.3,
        )
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
      // iOS-style push between two exact screens
      const push = (
        from: HTMLElement,
        to: HTMLElement,
        pos?: string | number,
        dur = 0.9,
      ) =>
        tl
          .fromTo(
            to,
            { xPercent: 100, autoAlpha: 1 },
            { xPercent: 0, duration: dur, ease: "power3.inOut" },
            pos,
          )
          .to(
            from,
            {
              xPercent: -28,
              duration: dur,
              ease: "power3.inOut",
            },
            "<",
          );
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

      const units = 51;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * units * UNIT_VH}`,
          pin: true,
          scrub: reduce ? true : 0.35, // Lenis already eases the scroll; keep scrub lag tiny so it never feels "stuck"
          invalidateOnRefresh: true,
          onUpdate: (self) =>
            gsap.set(q(".jr__progress i"), { scaleX: self.progress }),
        },
        onUpdate: () => {
          lastScrub = performance.now();
          seq.draw(state.frame);
        },
      });

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

      // Plumbing
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
      );
      fade(byName("home"), byName("plumbing-open"), "tapPlumb+=0.1", 0.7, 60);
      chapter(1, "tapPlumb+=0.1");
      tapAt(TAPS.fixture, "tapFix", "tapPlumb+=1.3");
      fade(byName("plumbing-open"), byName("plumbing-picked"), "tapFix", 0.3);

      // Date
      tl.addLabel("date", "tapFix+=0.9");
      push(byName("plumbing-picked"), byName("date"), "date");
      chapter(2, "date+=0.2");
      tapAt(TAPS.select, "tapSelect", "date+=1.6");

      // Technician: the screen becomes a window onto him, with the framed still behind the phone.
      // No cut-out, no zoom — one face, fitted inside the phone.
      tl.addLabel("tech", "tapSelect+=0.6");
      chapter(3, "tech");
      push(byName("date"), techPhoto as HTMLElement, "tech");
      tl.fromTo(
        techCard,
        { autoAlpha: 0, scale: 0.72 },
        { autoAlpha: 1, scale: 1, duration: 1.2, ease: "expo.out" },
        "tech+=0.5",
      );
      techCards.forEach((c, i) =>
        tl.fromTo(
          c,
          { autoAlpha: 0, y: 70, z: -120 },
          { autoAlpha: 1, y: 0, z: 0, duration: 0.9, ease: "expo.out" },
          `tech+=${1.2 + i * 0.15}`,
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
        "tech+=1.4",
      ).to(
        techCards,
        {
          y: (i, t) => -36 * Number((t as HTMLElement).dataset.d || 1),
          duration: 1.6,
        },
        "tech+=2.4",
      );

      // Review
      tl.addLabel("review", "tech+=4");
      chapter(4, "review");
      tl.to(
        techCards,
        { autoAlpha: 0, y: "-=30", duration: 0.5, stagger: 0.03 },
        "review",
      )
        .to(
          techCard,
          { autoAlpha: 0, scale: 0.8, duration: 0.6 },
          "review",
        )
        .to(
          techPhoto,
          { autoAlpha: 0, duration: 0.3 },
          "review+=1.1",
        )
        .to(
          q(".jr__phone .phone"),
          { rotateY: 8, duration: 1.4, ease: "sine.inOut" },
          "review",
        );
      push(byName("date"), byName("review"), "review+=0.2");
      // the order cards settle into the glass one by one, then the panel scrolls like the real app
      tl.fromTo(
        rvCards,
        { y: 46, scale: 0.94, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.09 },
        "review+=0.7",
      ).fromTo(
        q(".jr__rv-inner"),
        { y: 0 },
        { y: -RV_SCROLL, duration: 1.5, ease: "power2.inOut" },
        "review+=1.9",
      );
      tapAt(TAPS.confirm, "tapConfirm", "review+=3.6");

      // Confirmed
      tl.addLabel("done", "tapConfirm+=0.3");
      chapter(5, "done");
      tl.to(
          q(".jr__phone .phone"),
          { rotateY: 0, duration: 1, ease: "power3.inOut" },
          "done",
        )
        .fromTo(
          byName("confirmed"),
          { autoAlpha: 1, clipPath: "circle(0% at 70% 90%)" },
          {
            clipPath: "circle(150% at 70% 90%)",
            duration: 1,
            ease: "power3.inOut",
          },
          "done+=0.3",
        )
        .fromTo(
          q(".jr__pulse"),
          { scale: 0.5, autoAlpha: 0.7 },
          {
            scale: 2.6,
            autoAlpha: 0,
            duration: 1.8,
            stagger: 0.25,
            ease: "power1.out",
          },
          "done+=0.8",
        )
        // hold the confirmed booking; the section then scrolls away as a whole (no empty frame)
        .to({}, { duration: 1.2 });

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
        removeEventListener("ora:ready", go);
        removeEventListener("resize", applyFall);
        gsap.ticker.remove(idle);
      };
    }, el);

    return () => {
      ctx.revert();
      removeEventListener("resize", onResize);
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

        {/* photo card behind the phone (same still, same scale as the in-phone photo) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img fetchPriority="low" decoding="async"
          className="jr__techcard"
          src="/img/tech-card.webp"
          alt=""
          aria-hidden
        />

        <Phone>
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
          <div className="jr__techphoto" />
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

      <div className="jr__progress" aria-hidden>
        <i />
      </div>
    </section>
  );
}
