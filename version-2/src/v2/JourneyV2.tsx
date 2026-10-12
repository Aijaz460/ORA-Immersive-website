"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createSequence } from "@/lib/sequence";
import { paintStar, quadHomography } from "@/lib/splashStar";
import { ORA_WORDMARK_BOX } from "@/lib/oraWordmark";
import { createDust } from "./dust";
import type { Logo3D } from "@/lib/logo3d";
import {
  APP_H,
  APP_W,
  applyPhoneScale,
  isMobile,
  phoneScale,
  prefersReducedMotion,
} from "@/lib/stage";
import { FILM_QUAD, FILM_SCREEN, STORY as STORY_V1, TAPS } from "@/lib/journey";
import Phone from "@/components/ui/Phone";
import Lines from "@/components/ui/Lines";
import { Mark, STAR_PATH } from "@/components/ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Figma "Mobile UI Screens" exports, 2× — pixel-identical to the ORA app.
const SCREENS = [
  "splash-a",
  "home",
  "plumbing-open",
  "plumbing-picked",
  "date-base",
  "date",
  "conf",
  "review",
  "confirmed-base",
  "confirmed",
] as const;
// V2's own exports of these (the date screen's hand refitted above its glass card): public/v2/app
const V2_SCREEN = new Set<string>(["date-base", "date"]);

// The star on the Ora splash (01 A), in app px: centre and size. A vector copy sits exactly on it so the
// zoom through its centre stays crisp at any scale (the hole is the splash's own maroon).
const SPLASH_STAR = { x: 263.8, y: 411.8, size: 63.5 };
const SPLASH_ZOOM = 220; // the centre hole (≈9 px) grows past every edge of the screen

// Glass cards of the date and confirmation screens (Figma, 2× crops) in app px: they lift off the
// screen in 3D and settle exactly onto the full screen, which then takes over pixel for pixel.
const POP = {
  plumbing: { x: 19, y: 449, w: 374, h: 122 }, // Services list card 5 with the list at y −300
  date: { x: 16, y: 456, w: 380, h: 412 },
  confirmed: { x: 16, y: 234, w: 380, h: 644 },
};

// The plumber thumbnail on that screen (app px, radius 4) shows region R of the Step 04 photo (app px of
// tech-phone.webp; scripts/v2_confirm_screens.py bakes the same crop). The zoom into it is one pure zoom about
// the fixed point F where the thumbnail's photo and the full-screen photo coincide, so the camera pushes in
// and the thumbnail opens out into Step 04 with no cut: the photo only ever grows toward its native size.
const AVATAR = { x: 251, y: 468, w: 48, h: 48, r: 4 };
const AVATAR_SRC = { x: 18, y: 15, w: 380 };
const AV_M0 = AVATAR.w / AVATAR_SRC.w; // the photo's scale inside the thumbnail
const AV_F = {
  x: (AVATAR.x - AV_M0 * AVATAR_SRC.x) / (1 - AV_M0),
  y: (AVATAR.y - AV_M0 * AVATAR_SRC.y) / (1 - AV_M0),
};
const AV_ZOOM = 1.7; // timeline units of the push-in

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

// "Plumbing – Order Review" (Figma 2:13972): exact 2× card crops over the base screen, app px.
// The customer's own choices (service, slot, address, request) unfold onto the glass one by one.
const RV_CARDS = [
  { k: "service", x: 32, y: 361, w: 170, h: 132 },
  { k: "date", x: 210, y: 361, w: 170, h: 132 },
  { k: "about", x: 32, y: 505, w: 348, h: 56 },
  { k: "addr", x: 32, y: 573, w: 348, h: 72 },
  { k: "special", x: 32, y: 689, w: 348, h: 75 },
];

// Variant 2 film: from high above an everyday community of 8-storey apartment blocks (frames 0–59), down
// over the blocks to an open bathroom window on the 8th floor and through it (60–269), landing on the same
// shot of him at the leaking basin as Variant 1, whose film continues from there unchanged (270–349).
const STORY = {
  ...STORY_V1,
  path: "/v2/seq/story",
  mobilePath: "/v2/seq/story-m",
  frames: 350,
  aerialEnd: 210, // the drone has arrived at the open window
  leakEnd: 289, // Variant 1's 257
  liftEnd: 329, // Variant 1's 297: he holds the phone (the frame FILM_QUAD was fitted on)
};

// Variant 2 footage.
const CLIP = {
  tech: { path: "/v2/seq/tech", count: 61, w: 1100 },
  // chapter 07: one rendered 16:9 scene (4K masters) on its own warm stage. He walks in and waves
  // hello, his phone buzzes (hello); he reads the job and accepts it (accept), walks to the driver's door on the near (left, UAE) side and gets in (getin), then
  // drives off into the distance until the van is gone (drive). Each clip starts on the last one's frame.
  hello: { path: "/v2/seq/hello", count: 97, w: 2048 }, // he walks in from the right, waves, phone buzzes
  accept: { path: "/v2/seq/accept", count: 49, w: 2048 }, // he reads the job and accepts it
  getin: { path: "/v2/seq/getin", count: 73, w: 2048 },
  drive: { path: "/v2/seq/drive", count: 52, w: 2048 },
};
// The route map (his van on the community plan) is built but out of the flow for now.
const SHOW_ROUTE = false;

// The route: a stylised community plan in the design system (viewBox 1600×1000). The van leaves the
// Ora hub along the boulevard, turns up the side street and stops at the customer's townhouse.
const ROUTE = "M 140 742 C 300 700, 500 820, 820 700 L 900 300 L 1240 290";
const ROADS = [
  "M -80 772 L 140 742 C 300 700, 500 820, 820 700 C 1000 640, 1300 560, 1700 560",
  "M 820 700 L 900 300 L 960 -60",
  "M 600 309 L 1700 276",
  "M 470 -60 L 520 1060",
  "M 1300 1060 L 1220 570",
  "M -80 230 C 200 260, 330 210, 480 200",
];
// [x, y, w, h, kind]: a = apartment block, t = townhouse row, p = pool
const BLOCKS: [number, number, number, number, string][] = [
  [40, 80, 150, 110, "a"], [230, 70, 170, 120, "a"], [40, 300, 120, 160, "a"], [200, 290, 200, 90, "t"],
  [200, 410, 200, 90, "t"], [40, 520, 340, 120, "t"], [580, 40, 120, 170, "a"], [560, 390, 190, 110, "a"],
  [560, 540, 170, 80, "t"], [600, 820, 220, 120, "a"], [880, 780, 200, 150, "a"], [1120, 680, 150, 110, "t"],
  [1010, 60, 200, 150, "a"], [1260, 40, 280, 160, "a"], [990, 330, 110, 150, "t"], [1330, 330, 220, 90, "t"],
  [1330, 440, 220, 90, "t"], [1390, 640, 200, 160, "a"], [1330, 850, 240, 110, "a"], [80, 860, 300, 110, "t"],
  [1180, 210, 120, 60, "t"],
  [250, 205, 60, 34, "p"], [640, 450, 60, 30, "p"], [1430, 210, 70, 36, "p"],
];

// Opening sky (stills): the cloud deck with an opening onto the villa community, and
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

// Step 01 on phones (same tile order): three either side of the device, evenly spaced down its height
const MOBILE_TILE = [
  { side: 1, y: -0.02 }, // Cleaning
  { side: 1, y: -0.32 }, // AC & Mechanical
  { side: -1, y: -0.32 }, // Electrical
  { side: 1, y: 0.28 }, // Pest Control
  { side: -1, y: -0.02 }, // Handyman
  { side: -1, y: 0.28 }, // Water Tank
];
// the nine services' tools around the device in Step 01: four to the right, two to the left below the
// chapter card (the section title holds the space above it)
const TILES = [
  {
    src: "/img/tools/cleaning.webp",
    name: "Cleaning",
    x: 1.04,
    y: -0.06,
    d: 1.3,
  },
  {
    src: "/img/tools/ac-hammer.webp",
    name: "AC & Mechanical",
    x: 0.92,
    y: -0.36,
    d: 1,
  },
  {
    src: "/img/tools/electrical.webp",
    name: "Electrical",
    x: -1.0,
    y: 0.4,
    d: 0.8,
  },
  {
    src: "/img/tools/pest.webp",
    name: "Pest Control",
    x: 0.9,
    y: 0.24,
    d: 1.4,
  },
  {
    src: "/img/tools/handyman.webp",
    name: "Handyman",
    x: -0.82,
    y: 0.6,
    d: 1.1,
  },
  {
    src: "/img/tools/watertank.webp",
    name: "Water Tank",
    x: 1.0,
    y: 0.54,
    d: 0.9,
  },
];

// Communities shown in the carousel during the descent. Placeholder list: replace with the confirmed
// client communities before launch.
const COMMUNITIES = [
  "Town Square",
  "Arabian Ranches",
  "Dubai Hills Estate",
  "DAMAC Hills",
  "Jumeirah Village Circle",
  "Mudon",
  "Al Furjan",
  "The Springs",
  "Tilal Al Ghaf",
  "Emaar South",
  "Dubai Creek Harbour",
  "Mira",
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
    eyebrow: "Review",
    title: ["Everything on", "<em>one</em> screen."],
    body: "Service, slot, address and special requests. Confirm when it looks right.",
  },
  {
    k: "05",
    eyebrow: "Confirmed",
    title: ["Booked in", "<em>three</em> taps."],
    body: "Your reference number arrives instantly. Live updates follow until the job is done.",
  },
  {
    k: "06",
    eyebrow: "Your technician",
    title: ["Real people.", "<em>Properly</em> trained."],
    body: "Background-checked, trained in-house and on our payroll. You see who is coming before they ring the bell.",
  },
  {
    k: "07",
    eyebrow: "On the way",
    title: ["Accepted.", "<em>On his</em> way."],
    body: "Your technician accepts in seconds and drives over in an Ora van with the right tools. Follow him live to your door.",
  },
];

// CSS matrix3d that maps a w×h box (transform-origin 0 0) onto a quad [tl, tr, br, bl]: a
// projective transform, so flat screens sit in the film phone's real perspective.
function quadMatrix(w: number, h: number, quad: number[][]) {
  const adj = (m: number[]) => [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
  const mul = (a: number[], b: number[]) => {
    const c = new Array(9).fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j];
    return c;
  };
  const mulv = (m: number[], v: number[]) => [0, 1, 2].map((i) => m[3 * i] * v[0] + m[3 * i + 1] * v[1] + m[3 * i + 2] * v[2]);
  const basis = (p: number[][]) => {
    // p = [tl, tr, bl, br]
    const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
    const v = mulv(adj(m), [p[3][0], p[3][1], 1]);
    return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
  };
  const [tl, tr, br, bl] = quad;
  const s = basis([[0, 0], [w, 0], [0, h], [w, h]]);
  const d = basis([tl, tr, bl, br]);
  const t = mul(d, adj(s)).map((v, _, a) => v / a[8]);
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}

export default function JourneyV2() {
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
    // Late-story clips: the technician's smile and folded arms, scrubbed in both the card
    // and the in-phone crop; the 3D technician accepting the job and riding off (keyed, transparent).
    // They load once the viewer is into the story so they never compete with the opening frames.
    const clip = { stride: 4, concurrency: 3, lazy: true };
    const techSeq = createSequence(q<HTMLCanvasElement>(".jr__techcv--card")[0], {
      ...clip,
      path: CLIP.tech.path,
      count: CLIP.tech.count,
      sourceWidth: CLIP.tech.w,
      focusY: 0,
      mirrors: [q<HTMLCanvasElement>(".jr__techcv--phone")[0]],
    });

    const keyed = { ...clip, fit: "cover" as const, focusY: 0.5 }; // chapter 07 clips: opaque, full-frame
    const acceptSeq = createSequence(q<HTMLCanvasElement>(".jr__avcv")[0], {
      ...keyed,
      path: CLIP.accept.path,
      count: CLIP.accept.count,
      sourceWidth: CLIP.accept.w,
    });
    const helloSeq = createSequence(q<HTMLCanvasElement>(".v2-yard__hellocv")[0], {
      ...keyed,
      path: CLIP.hello.path,
      count: CLIP.hello.count,
      sourceWidth: CLIP.hello.w,
    });
    const getinSeq = createSequence(q<HTMLCanvasElement>(".v2-yard__gincv")[0], {
      ...keyed,
      path: CLIP.getin.path,
      count: CLIP.getin.count,
      sourceWidth: CLIP.getin.w,
    });
    const driveSeq = createSequence(q<HTMLCanvasElement>(".v2-yard__drivecv")[0], {
      ...keyed,
      path: CLIP.drive.path,
      count: CLIP.drive.count,
      sourceWidth: CLIP.drive.w,
    });
    const clips = [techSeq, helloSeq, acceptSeq, getinSeq, driveSeq];
    const dust = createDust(q<HTMLCanvasElement>(".v2-yard__dust")[0]);
    const loadClips = () => clips.forEach((c) => c.load());
    const clipTimer = setTimeout(loadClips, 12000); // fallback if the viewer lingers at the top
    const onResize = () => {
      [seq, ...clips].forEach((s) => s.resize());
      dust.resize();
    };
    addEventListener("resize", onResize);

    // the 3D mark (three.js) loads on demand; the stage paints brand red until it is ready
    let logo: Logo3D | null = null;
    document.documentElement.classList.add("on-mark");
    let logoGone = false;
    const logoCanvas = q<HTMLCanvasElement>(".jr__logo3d")[0];
    import("@/lib/logo2d").then(({ createLogo2D }) => {
      if (logoGone) return;
      try {
        logo = createLogo2D(logoCanvas, { reduce });
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
      const techCards = q<HTMLElement>(".jr__qcard--tech");
      // the section title stays in one place through all seven steps: above the highest of the step cards,
      // below the site header, and clear of the device (and Step 04's photo card) across
      const heads = q<HTMLElement>(".v2-lefthead");
      // Step 06's numbers count up with the scroll (state.count 0 → 1)
      const paintCounts = () =>
        q<HTMLElement>("[data-count]").forEach(
          (n) => (n.textContent = (Number(n.dataset.count) * state.count).toFixed(Number(n.dataset.dec || 0))),
        );
      let mobileCy = 0; // phones: the device's centre, set by placeHeads in the space below the step cards
      // the phone scale this section uses (its own --s on short phones, else the site-wide one)
      const storyScale = () =>
        parseFloat(getComputedStyle(root.current ?? document.documentElement).getPropertyValue("--s")) || phoneScale();
      const placeHeads = () => {
        const h = heads[0];
        if (!h) return;
        if (isMobile()) {
          // phones: the title is one line under the header (CSS), the step card below it shows its whole
          // text, and the device sits in the space that is left, below the tallest card, above the dots
          h.style.bottom = "";
          h.style.fontSize = "";
          h.style.display = "";
          const cardBottom = Math.max(...chapters.map((c) => c.offsetTop + c.offsetHeight));
          const top = cardBottom + 18;
          const floor = innerHeight - 44;
          // short phones: the device scales down until it fits between the cards and the dots (the scale is
          // set on this section only, so the site-wide phone scale and the other sections are untouched)
          applyPhoneScale();
          root.current?.style.removeProperty("--s");
          const ph = q<HTMLElement>(".jr__phone .phone")[0].offsetHeight;
          if (ph > floor - top) root.current?.style.setProperty("--s", String((phoneScale() * (floor - top)) / ph));
          mobileCy = (top + floor) / 2;
          root.current?.style.setProperty("--phone-cy", `${mobileCy}px`);
          return;
        }
        mobileCy = 0;
        root.current?.style.removeProperty("--phone-cy");
        root.current?.style.removeProperty("--s");
        const ui = q<HTMLElement>(".jr__app-ui")[0].getBoundingClientRect();
        const top = Math.min(
          ...chapters.map((c) => c.getBoundingClientRect().top - (Number(gsap.getProperty(c, "y")) || 0)),
        );
        // both lines between the site header (≈96px) and the cards: shrink the type to fit the room there is
        const room = top - ui.top - 64 - 96;
        h.style.bottom = `${ui.bottom - top + 64}px`;
        h.style.fontSize = "";
        let size = Math.min(parseFloat(getComputedStyle(h).fontSize), room / 2.05);
        h.style.fontSize = `${size}px`;
        // his photo card, at the size it settles to (it may be mid-animation when this runs)
        const tc = techCard.getBoundingClientRect();
        const k = Number(gsap.getProperty(techCard, "scale")) || TECH_Z;
        const phoneLeft = q<HTMLElement>(".jr__phone .phone")[0].getBoundingClientRect().left - 32;
        const cardLeft = tc.left + tc.width / 2 - ((tc.width / k) * TECH_Z) / 2 - 32;
        const hl = h.getBoundingClientRect().left;
        const widest = Math.max(...[...h.querySelectorAll<HTMLElement>(".v2-lefthead__l")].map((l) => l.scrollWidth));
        const fit = (stop: number) => (widest > stop - hl ? (size * (stop - hl)) / widest : size);
        // clear of his photo card too where that still leaves a readable title; never hidden on desktop
        size = fit(Math.min(phoneLeft, cardLeft)) >= 30 ? fit(Math.min(phoneLeft, cardLeft)) : fit(phoneLeft);
        h.style.fontSize = `${size}px`;
        h.style.display = "";
      };
      placeHeads();
      addEventListener("resize", placeHeads);
      const headIn = (h: HTMLElement, at: string | number) =>
        tl.call(placeHeads, [], at).fromTo(
          h.querySelectorAll(".v2-lefthead__l"),
          { autoAlpha: 0, yPercent: 60 },
          { autoAlpha: 1, yPercent: 0, duration: 0.8, delay: 0.2, ease: "expo.out", stagger: 0.08 },
          at,
        );
      const rvCards = q<HTMLElement>(".jr__rv-card");
      let lastScrub = 0;
      const appIcon = q(".jr__fs-appicon")[0];
      const splashA = q(".jr__fs--a")[0];
      const splashB = q(".jr__fs--b")[0];
      const splashImg = q<HTMLImageElement>(".jr__fs--a")[0];
      // the Ora splash's background and wordmark scaled about its star's centre (k), at screen resolution
      // (u = canvas px per app px); the hole is the splash's own maroon
      const paintSplash = (cv: HTMLCanvasElement, k: number, u: number) => {
        const w = Math.max(1, Math.round(412 * u));
        const h = Math.max(1, Math.round(910 * u));
        if (cv.width !== w || cv.height !== h) {
          cv.width = w;
          cv.height = h;
        }
        const ctx = cv.getContext("2d")!;
        const { x: sx, y: sy, size } = SPLASH_STAR;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#46150f";
        ctx.fillRect(0, 0, w, h);
        ctx.setTransform(u * k, 0, 0, u * k, u * sx * (1 - k), u * sy * (1 - k));
        if (k < 30 && splashImg.complete) ctx.drawImage(splashImg, 0, 0, 412, 910); // status bar etc., until gone
        ctx.fillStyle = "#46150f";
        ctx.fillRect(sx - size * 0.56, sy - size * 0.56, size * 1.12, size * 1.12); // hide the bitmap star
        const wb = ORA_WORDMARK_BOX;
        ctx.fillRect(wb.x, wb.y, wb.w, wb.h); // and the bitmap lettering
        // (the star and the lettering are drawn as vector geometry on the screen-space layer: see zoomFrame)
      };
      const starCv = q<HTMLCanvasElement>(".jr__starcv")[0];
      const zoomCv = q<HTMLCanvasElement>(".jr__fs-zoom")[0];
      const starHole = q<HTMLElement>(".jr__hole")[0]; // the star's centre, full screen: Step 01 opens out of it
      const ZOOM = 5.2; // scroll units: into the star on his phone and through its centre
      const listInner = q(".jr__list-inner")[0];
      const cardsIn = q<HTMLElement>(".jr__card");
      const state = { frame: 0, count: 0, tech: 0, hello: 0, accept: 0, getin: 0, drive: 0 };

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
      const phoneCy = () => (isMobile() && mobileCy ? mobileCy : innerHeight * (isMobile() ? 0.6 : 0.52));
      const glassW = () => APP_W * storyScale();
      const glassH = () => APP_H * storyScale();
      // scale/offset (and a camera roll, degrees) that puts the film phone's screen centre on the app
      // phone's spot at scale k; the scene's transform origin is its top-left corner
      const frameOn = (k: number, roll = 0) => {
        const b = box();
        const cx = (FILM_SCREEN.x + FILM_SCREEN.w / 2) * b.w;
        const cy = (FILM_SCREEN.y + FILM_SCREEN.h / 2) * b.h;
        const r = (roll * Math.PI) / 180;
        const px = k * (Math.cos(r) * cx - Math.sin(r) * cy);
        const py = k * (Math.sin(r) * cx + Math.cos(r) * cy);
        return { k, rotation: roll, x: phoneCx() - b.left - px, y: phoneCy() - b.top - py };
      };
      // a point of his screen (app px) → the scene, through the film's own perspective (his screen's 4 corners)
      const onHisScreen = (ax: number, ay: number) => {
        const b = box();
        const [p0, p1, p2, p3] = FILM_QUAD.map(([x, y]) => [x * b.w, y * b.h]);
        const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0];
        const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1];
        const den = dx1 * dy2 - dx2 * dy1;
        const g = (dx3 * dy2 - dx2 * dy3) / den;
        const hh = (dx1 * dy3 - dx3 * dy1) / den;
        const u = ax / 412, v = ay / 910;
        const wq = g * u + hh * v + 1;
        return {
          x: ((p1[0] - p0[0] + g * p1[0]) * u + (p3[0] - p0[0] + hh * p3[0]) * v + p0[0]) / wq,
          y: ((p1[1] - p0[1] + g * p1[1]) * u + (p3[1] - p0[1] + hh * p3[1]) * v + p0[1]) / wq,
        };
      };
      // The zoom into the star, one scroll value p (0→1) at a constant perceived speed (exponential):
      // first the camera closes in on his screen at his angle until it fills the view (the star drifting to
      // the centre), then the zoom carries on inside his screen (drawn per frame, never a giant layer)
      const zoomP = { p: 0 };
      const zoomFrame = () => {
        const b = box();
        const S = onHisScreen(SPLASH_STAR.x, SPLASH_STAR.y);
        const push = frameOn(pushK());
        const s0 = push.k;
        const P0 = { x: b.left + push.x + s0 * S.x, y: b.top + push.y + s0 * S.y };
        const C = { x: innerWidth / 2, y: innerHeight / 2 };
        const Hs = s0 * FILM_SCREEN.h * b.h; // his screen on screen at the end of the lean-in
        const Ws = (Hs * 412) / 910;
        const z1 = Math.max((innerHeight * 1.25) / Hs, (innerWidth * 1.25) / Ws); // his screen fills the view
        const pxPerApp = (Hs * z1) / 910;
        const kEnd = (1.35 * Math.hypot(innerWidth, innerHeight)) / 2 / (4.2 * pxPerApp); // hole past every corner
        const z = Math.exp(Math.log(z1 * kEnd) * zoomP.p);
        const zs = Math.min(z, z1);
        const f = Math.log(zs) / Math.log(z1);
        const fe = f * f * (3 - 2 * f);
        const T = { x: P0.x + (C.x - P0.x) * fe, y: P0.y + (C.y - P0.y) * fe };
        const sc = s0 * zs;
        const tx = T.x - b.left - sc * S.x;
        const ty = T.y - b.top - sc * S.y;
        gsap.set(scene, { scale: sc, x: tx, y: ty, force3D: false });
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const u = Math.min(3.5, Math.max(1, Math.round(((sc * FILM_SCREEN.h * b.h) / 910) * dpr * 4) / 4));
        const k = Math.max(1, z / z1);
        paintSplash(zoomCv, k, u);
        // the star: vector geometry through his screen's perspective and the camera, at full display resolution;
        // the opening mark's own move, a quarter turn as it comes to face you (the symmetric star settles on itself)
        const H = quadHomography(FILM_QUAD.map(([x, y]) => [x * b.w, y * b.h] as [number, number]));
        const toScreen = (ax: number, ay: number) => {
          const P = H(ax / 412, ay / 910);
          return P ? ([b.left + tx + sc * P[0], b.top + ty + sc * P[1]] as [number, number]) : null;
        };
        const turn = Math.min(1, Math.max(0, (zoomP.p - 0.1) / 0.52));
        paintStar(starCv, toScreen, SPLASH_STAR, k, (Math.PI / 2) * turn * turn * (3 - 2 * turn));
      };
      // over his shoulder: his screen fills about half the view
      const pushK = () => (innerHeight * (isMobile() ? 0.42 : 0.56)) / (FILM_SCREEN.h * box().h);
      // the dive: the film screen lands exactly on the app phone's glass (heights matched)
      const dive = () => frameOn(glassH() / (FILM_SCREEN.h * box().h));
      // The 3D star shares the opening's WebGL canvas (full viewport, mark centred). Here the canvas is
      // shifted so the mark sits on his screen, and starts the size of the app's star on that screen
      // (14.5% of the screen wide, 5% above its centre); at rest the mark is ~58% of the viewport's
      // short side, and the logo's own intro starts it at 62% of that.
      const FLY = 3.2; // scroll units to fly into the star and through it
      const phoneLogo = { p: 0 };
      const showPhoneLogo = () => {
        logo?.setStage(false);
        logo?.setProgress(phoneLogo.p);
      };
      const starAt = () => {
        const r = filmScreen.getBoundingClientRect();
        return { x: r.left + r.width / 2 - innerWidth / 2, y: r.top + r.height / 2 - innerHeight / 2, h: r.height, w: r.width };
      };
      const starScale = () => (starAt().w * 0.145) / (0.58 * 0.62 * Math.min(innerWidth, innerHeight));
      // his screen in perspective: the launch screens (412×910) mapped onto the four film corners.
      // During the dive `straight` eases it into an upright 412:910 box of the same height and centre,
      // which the zoom then lands exactly on the app phone's glass: one screen, no double image.
      const straight = { p: 0 };
      const placeScreen = () => {
        const b = box();
        const cx = (FILM_SCREEN.x + FILM_SCREEN.w / 2) * b.w;
        const cy = (FILM_SCREEN.y + FILM_SCREEN.h / 2) * b.h;
        const h = FILM_SCREEN.h * b.h;
        const w = (h * 412) / 910;
        const upright = [
          [cx - w / 2, cy - h / 2],
          [cx + w / 2, cy - h / 2],
          [cx + w / 2, cy + h / 2],
          [cx - w / 2, cy + h / 2],
        ];
        const k = straight.p;
        filmScreen.style.transform = quadMatrix(
          412,
          910,
          FILM_QUAD.map(([x, y], i) => [x * b.w + (upright[i][0] - x * b.w) * k, y * b.h + (upright[i][1] - y * b.h) * k]),
        );
      };
      placeScreen();
      addEventListener("resize", placeScreen);

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
        "#C7DEEF", // review: the app's own Cleaning blue
        "#ABBD94",
        "#FCDDA1", // your technician, once the booking is confirmed
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
        // the section title arrives with Step 01 and stays through every step
        if (i === 0) headIn(heads[0], pos ?? ">");
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

      gsap.set(screens.slice(1), { autoAlpha: 0 });
      // the splash stays dark until his screen wakes
      gsap.set(screens[0], { autoAlpha: 0 });
      gsap.set([phoneWrap, env, filmScreen, q(".jr__app-ui")[0]], {
        autoAlpha: 0,
      });

      // zoom the film toward a point of the frame (fractions of the 16:9 box), origin 0 0
      const zoomTo = (px: number, py: number, k: number) => {
        const b = box();
        return { scale: k, x: (1 - k) * px * b.w, y: (1 - k) * py * b.h };
      };
      gsap.set([splashA, splashB, q(".jr__fs--c")[0]], { autoAlpha: 0 });

      // The story is one paused timeline; the scroll drives it through a pace map (bottom of this
      // block) so every beat gets a scroll length that matches how much happens in it.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        paused: true,
        onUpdate: () => {
          lastScrub = performance.now();
          seq.draw(state.frame);
          if (tl.time() > (tl.labels.leak ?? 1e9)) loadClips();
          techSeq.draw(state.tech);
          helloSeq.draw(state.hello);
          acceptSeq.draw(state.accept);
          getinSeq.draw(state.getin);
          driveSeq.draw(state.drive);
          dust.draw(state.drive);
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
              logo?.setStage(true);
              gsap.set(logoCanvas, { x: 0, y: 0, scale: 1 });
              logo?.setProgress(logoState.p);
              document.documentElement.classList.toggle("on-mark", logoState.p < 0.97);
            },
          },
          "logo",
        )
        .to(q(".jr__logocue"), { autoAlpha: 0, y: 10, duration: 0.5 }, "logo")
        // opacity only: toggling visibility on a live WebGL canvas makes the compositor drop and rebuild
        // its layer, a one-off stall of up to a second on the first scroll
        .set(q(".jr__logo3d"), { opacity: 0 }, `logo+=${LOGO}`)
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
        const k0 = start + (1 - start) * fall.k;
        const c = Math.pow(k0 / start, 1.8); // the clouds rush outward faster than the film grows
        // ...so the film must always reach past the opening's soft edge, where the clouds only turn fully solid
        // at ~1.32× the opening (measured from clouds.webp / clouds-m.webp), on each of the four sides
        // separately (it zooms about the opening, which sits off-centre), or to the screen edge if nearer
        const px = (h.x - b.left) / b.w;
        const py = (h.y - b.top) / b.h;
        const R = 1.38;
        const rx = (R * h.w * c) / 2;
        const ry = (R * h.h * c) / 2;
        const need = Math.min(
          1,
          Math.max(
            Math.min(h.x, rx) / (px * b.w),
            Math.min(innerWidth - h.x, rx) / ((1 - px) * b.w),
            Math.min(h.y, ry) / (py * b.h),
            Math.min(innerHeight - h.y, ry) / ((1 - py) * b.h),
          ),
        );
        const k = Math.max(k0, need);
        const z = zoomTo(px, py, k);
        gsap.set(scene, { scale: z.scale, x: z.x, y: z.y, force3D: false });
        deck.style.transformOrigin = `${h.x}px ${h.y}px`;
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
          { frame: f(STORY.aerialEnd), duration: 10, ease: "sine.inOut" },
          "fly",
        )
        // the communities that trust Ora pass right to left while we descend onto one of them
        .fromTo(
          q(".v2-clients"),
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" },
          "fly+=2",
        )
        .fromTo(
          q(".v2-clients__track"),
          { x: () => innerWidth * 0.35 },
          { x: () => -(q(".v2-clients__track")[0].scrollWidth - innerWidth * 0.45), duration: 8.2, ease: "none" },
          "fly+=1.6",
        )
        .to(q(".v2-clients"), { autoAlpha: 0, y: -16, duration: 0.8, ease: "power2.in" }, "fly+=9.1")

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
        .to(state, { frame: f(STORY.liftEnd), duration: 4, ease: "sine.inOut" }, "lift")
        // the camera leans in over his shoulder onto the phone in his hand: his screen, his view
        .to(
          scene,
          {
            scale: () => frameOn(pushK()).k,
            x: () => frameOn(pushK()).x,
            y: () => frameOn(pushK()).y,
            duration: 3.6,
            ease: "sine.inOut",
            force3D: false,
          },
          "lift+=0.9",
        )
        .fromTo(
          q(".jr__cap--lift"),
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "lift+=1.8",
        )

        // ===== 4 · his screen wakes: the Ora app starting, on his own phone. Only once the film has settled on
        // its last frame (lift+4): his screen is fitted to that frame, so it never floats off a moving phone =====
        .addLabel("wake", "lift+=4.55")
        .set([q(".jr__fs--icon")[0], q(".jr__fs-home")[0], q(".jr__fs-tap")[0]], { autoAlpha: 0 }, "wake")
        .set([splashA, zoomCv], { autoAlpha: 1, scale: 1, clipPath: "none" }, "wake")
        .call(zoomFrame, undefined, "wake")
        .fromTo(
          filmScreen,
          { autoAlpha: 0, filter: "brightness(0.35)" },
          { autoAlpha: 1, filter: "brightness(1)", duration: 0.8, ease: "power2.out" },
          "wake",
        )
        .fromTo(starCv, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, "wake")
        .set(filmScreen, { filter: "none" }, "wake+=0.85")

        // ===== 5 · scroll: into the star on his phone, at his angle, and through its centre =====
        .addLabel("zoom", "wake+=1.4")
        .to(q(".jr__cap--lift"), { autoAlpha: 0, y: -30, duration: 0.5 }, "zoom")
        .fromTo(zoomP, { p: 0 }, { p: 1, duration: ZOOM, ease: "none", onUpdate: zoomFrame, immediateRender: false }, "zoom")

        // ===== 6 · Step 01 opens out of the star's centre =====
        // the hole has filled the view: a full-screen maroon takes over (same colour), the app is set behind it
        .addLabel("open", `zoom+=${ZOOM}`)
        .set(starHole, { autoAlpha: 1, "--r": "0vmax" }, "open")
        .set([canvas, filmScreen, starCv], { autoAlpha: 0 }, "open")
        .set(scene, { scale: () => dive().k, x: () => dive().x, y: () => dive().y, force3D: false }, "open")
        .set(q(".jr__soft"), { autoAlpha: 1 }, "open")
        .set(q(".jr__tint"), { autoAlpha: 0.62 }, "open")
        .set([phoneWrap, q(".jr__app-ui")[0]], { autoAlpha: 1 }, "open")
        .addLabel("app", "open+=0.1")
        .to(starHole, { "--r": "150vmax", duration: 1.3, ease: "power2.inOut" }, "app")
        .set(starHole, { autoAlpha: 0 }, "app+=1.3")
        // ===== 6 · the app, one frame, the UI changes =====
        .to(q(".jr__glow"), { autoAlpha: 1, duration: 1 }, "app");
      chapter(0, "app");
      // Services is on the phone as the view opens out of the star's centre
      tl.set(byName("home"), { autoAlpha: 1, clipPath: "none" }, "open").fromTo(
        byName("home"),
        { scale: 0.97 },
        { scale: 1, duration: 0.8, ease: "power3.out" },
        "app+=0.3",
      );
      // phones/tablets: tiles are centred on their spot by GSAP (it folds a CSS translate into its transform
      // unevenly); desktop keeps its original centring untouched
      if (isMobile()) gsap.set(tiles, { xPercent: -50, yPercent: -50 });
      tiles.forEach((t, i) => {
        const d = Number(t.dataset.d);
        tl.fromTo(
          t,
          { x: 0, y: 0, z: -300, scale: 0.4, autoAlpha: 0 },
          {
            x: () =>
              // phones: three captioned tiles in the narrow strip either side of the device, evenly spaced
              isMobile()
                ? MOBILE_TILE[i].side * (glassW() * 0.527 + (innerWidth - glassW() * 1.054) / 4)
                : Number(t.dataset.x) * glassW() * 1.25,
            // phones: rows 0.3 of the screen height apart, but never closer than a tile is tall
            y: () =>
              isMobile()
                ? (MOBILE_TILE[i].y / 0.3) * Math.max(0.3 * glassH(), t.offsetHeight + 8)
                : Number(t.dataset.y) * glassH(),
            z: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 1.1,
            ease: "expo.out",
          },
          `app+=${0.6 + i * 0.1}`,
        );
        tl.to(t, { y: () => `-=${(isMobile() ? 8 : 50) * d}`, duration: 2.4 }, "app+=1.6");
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

      // ===== Step 04 · Review: the order screen settles over the date, its cards unfold in 3D, the choices pop =====
      tl.addLabel("review", "tapSelect+=0.6");
      chapter(3, "review");
      tl.fromTo(
          byName("review"),
          { autoAlpha: 0, scale: 0.9, transformOrigin: "50% 60%" },
          { autoAlpha: 1, scale: 1, duration: 1, ease: "power3.out", immediateRender: false },
          "review",
        )
        .set(byName("date"), { autoAlpha: 0 }, "review+=1")
        .to(phone, { rotateY: 8, rotateX: 3, duration: 1.4, ease: "sine.inOut" }, "review");
      tl.fromTo(
        rvCards,
        { autoAlpha: 0, rotateX: -75, z: -140, y: 60, transformPerspective: 900, transformOrigin: "50% 0%" },
        { autoAlpha: 1, rotateX: 0, z: 0, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.12 },
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
      // the choices the customer made light up in order: service and slot, then address and request
      popCard(0, "review+=2");
      popCard(1, "review+=2.28");
      popCard(3, "review+=3.1");
      popCard(4, "review+=3.38");
      tapAt(TAPS.confirm, "tapConfirm", "review+=4.3");

      // ===== Step 05 · Confirmed: the card lands in 3D, a seal and brand confetti burst around the device =====
      tl.addLabel("done", "tapConfirm+=0.3");
      chapter(4, "done");
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
        // the review screen sits above the order details in the stack: retire it once it's covered
        .set(byName("review"), { autoAlpha: 0 }, "done+=1.8")
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

      // ===== Still Step 05: the confirmed order's details, with the technician assigned to it =====
      tl.addLabel("conf", "done+=3");
      tl.fromTo(
          byName("conf"),
          { autoAlpha: 0, scale: 0.96, transformOrigin: "50% 60%" },
          { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power2.out", immediateRender: false },
          "conf",
        )
        .set([byName("confirmed"), byName("confirmed-base")], { autoAlpha: 0 }, "conf+=0.7");

      // ===== Into his photo: the plumber's thumbnail grows out of its card until it is the whole screen =====
      // the screen stays where it is; only the photo moves. One scroll value p: its window opens from the
      // thumbnail box (radius 4) to the full screen, and the photo inside scales from the thumbnail's crop
      // (AV_M0, about AV_F, where both framings coincide) up to its native size: always sharp, never stretched
      const avP = { p: 0 };
      const avFrame = () => {
        const p = avP.p;
        const s = Math.pow(AV_M0, 1 - p); // the photo's scale on screen: thumbnail → native
        gsap.set(techPhoto, { transformOrigin: `${AV_F.x}px ${AV_F.y}px`, scale: s, force3D: false });
        // its window, in the photo's own px: the thumbnail's crop opening out to the whole photo, so the
        // window always lies on the photo (never past its edges) while both grow together
        const L = AVATAR_SRC.x * (1 - p);
        const T = AVATAR_SRC.y * (1 - p);
        const Rr = (AVATAR_SRC.x + AVATAR_SRC.w) * (1 - p) + APP_W * p;
        const B = (AVATAR_SRC.y + AVATAR_SRC.w) * (1 - p) + APP_H * p;
        const rad = p < 1 ? AVATAR.r + 22 * Math.sin(Math.PI * p) : 0; // screen px: a lifted card, then flush
        techPhoto.style.clipPath = `inset(${T}px ${APP_W - Rr}px ${APP_H - B}px ${L}px round ${rad / s}px)`;
      };
      tl.addLabel("techZoom", "conf+=1.1");
      tl
        .set(techPhoto, { autoAlpha: 1 }, "techZoom")
        .add(avFrame, "techZoom")
        .fromTo(
          avP,
          { p: 0 },
          { p: 1, duration: AV_ZOOM, ease: "power2.inOut", onUpdate: avFrame, immediateRender: false },
          "techZoom",
        )
        .set(byName("conf"), { autoAlpha: 0 }, `techZoom+=${AV_ZOOM}`);
      chapter(5, `techZoom+=${AV_ZOOM - 0.4}`);

      // ===== Step 06 · Your technician: the photo is the whole screen; his card rises behind the device =====
      tl.addLabel("tech", `techZoom+=${AV_ZOOM - 0.6}`);
      // (at p = 1 the photo's zoom is exactly 1 and its window the full screen: nothing to hand over)
      tl.fromTo(
          techCard,
          { autoAlpha: 0, scale: 0.72 * TECH_Z, rotateY: -10 },
          // on phones the card would be wider than the screen (cut edges): the device alone is the frame
          { autoAlpha: () => (isMobile() ? 0 : 1), scale: TECH_Z, rotateY: 0, duration: 1.2, ease: "expo.out" },
          "tech+=0.9",
        )
        // he looks up, smiles, then folds his arms (same shot and background)
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
          onUpdate: () => paintCounts(),
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

      // ===== On the way (Variant 1's staging): his Ora van parked on the warm stage, he takes the job, gets
      // in on the driver's side (UAE) and drives off until the van is gone =====
      tl.addLabel("accept", "tech+=4.9");
      chapter(6, "accept");
      tl.to(techCards, { autoAlpha: 0, y: "-=30", duration: 0.5, stagger: 0.03 }, "accept")
        .to(techCard, { autoAlpha: 0, scale: 0.8 * TECH_Z, rotateY: 8, duration: 0.7 }, "accept");
      const yard = q<HTMLElement>(".v2-stage")[0];
      const notif = q(".jr__notif")[0];
      const helloCv = q(".v2-yard__hellocv")[0];
      const avCv = q(".jr__avcv")[0];
      const HI = 4.6; // scroll units: he walks in from the right, waves hello, his phone buzzes
      const AV = 3.6; // scroll units: he reads the job and accepts it
      const B = 1.2 + HI; // the accept clip takes over on the hello clip's last frame
      tl.to(
        phoneWrap,
        { x: () => -innerWidth * (isMobile() ? 0.2 : 0.16), y: 30, scale: 0.8, autoAlpha: 0, duration: 0.7, ease: "power2.in" },
        "accept",
      )
        // the warm stage fades up on his parked van (same wide camera for the whole chapter)
        .fromTo(yard, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: "power1.out" }, "accept+=0.55")
        .set(helloCv, { autoAlpha: 1 }, "accept")
        .set(avCv, { autoAlpha: 0 }, "accept")
        // as you scroll he walks in from the right, stops by the van and waves hello
        .to(state, { hello: 1, duration: HI, ease: "none" }, "accept+=1.2")
        .set(helloCv, { autoAlpha: 0 }, `accept+=${B}`)
        .set(avCv, { autoAlpha: 1 }, `accept+=${B}`)
        .to(state, { accept: 1, duration: AV, ease: "none" }, `accept+=${B}`)
        // the job lands as he takes the phone out; he taps Accept
        .fromTo(
          notif,
          { autoAlpha: 0, scale: 0.7, y: 20 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.8)" },
          `accept+=${B - 0.35}`,
        )
        .to(q(".jr__notif b"), { scale: 0.92, duration: 0.12 }, `accept+=${B + AV * 0.5}`)
        .to(q(".jr__notif b"), { scale: 1, duration: 0.2 }, ">")
        .to(q(".jr__notif .is-idle"), { autoAlpha: 0, duration: 0.15 }, `accept+=${B + AV * 0.53}`)
        .fromTo(q(".jr__notif .is-done"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, `accept+=${B + 0.05 + AV * 0.53}`)
        .to(q(".jr__notif b"), { backgroundColor: "#2f5a26", duration: 0.3 }, `accept+=${B + AV * 0.53}`)
        .to(notif, { autoAlpha: 0, y: -24, duration: 0.5, ease: "power2.in" }, `accept+=${B + AV * 0.9}`);

      // he pockets the phone, walks to the driver's door (left side, UAE) and gets in; then the van pulls
      // away and drives off left along the road, behind the chapter card. Real footage, frame by frame.
      const ginCv = q(".v2-yard__gincv")[0];
      const driveCv = q(".v2-yard__drivecv")[0];
      const GIN = 3.4; // scroll units: to the door, in, door shut
      const DRIVE = 4.6; // scroll units: pulls away and leaves along the road
      // the same shot continues: he heads for the driver's door
      tl.addLabel("ride", `accept+=${B + 0.1 + AV}`);
      tl.set(ginCv, { autoAlpha: 1 }, "ride")
        .set(avCv, { autoAlpha: 0 }, "ride")
        .to(state, { getin: 1, duration: GIN, ease: "none" }, "ride")
        .addLabel("away", `ride+=${GIN}`)
        .set([driveCv, q(".v2-yard__dust")[0]], { autoAlpha: 1 }, "away")
        .set(ginCv, { autoAlpha: 0 }, "away")
        .to(state, { drive: 1, duration: DRIVE, ease: "none" }, "away")
        .to({}, { duration: 0.5 });

      if (SHOW_ROUTE) {
      // ===== the route: the camera rises over the community and follows his van to your door =====
      const route = q(".v2-route")[0];
      const plane = q(".v2-route__plane")[0];
      const cam = q<SVGGElement>(".v2-route__cam")[0];
      const path = q<SVGPathElement>(".v2-route__path")[0];
      const done = q<SVGPathElement>(".v2-route__done")[0];
      const van = q<SVGGElement>(".v2-route__van")[0];
      const etaEl = q(".v2-route__eta b")[0];
      const LEN = path.getTotalLength();
      done.style.strokeDasharray = `${LEN}`;
      const drive = { p: 0 };
      const ease = (a: number, b: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      const placeVan = () => {
        const d = drive.p * LEN;
        const pt = path.getPointAtLength(d);
        const ah = path.getPointAtLength(Math.min(LEN, d + 4));
        const bh = path.getPointAtLength(Math.max(0, d - 4));
        const ang = (Math.atan2(ah.y - bh.y, ah.x - bh.x) * 180) / Math.PI;
        van.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${ang})`);
        done.style.strokeDashoffset = `${LEN - d}`;
        // the camera rides with the van, then pulls back to show the whole route as he arrives
        const out = ease(0.72, 1, drive.p);
        const [z0, z1] = isMobile() ? [1.25, 0.72] : [2.1, 1];
        const z = z0 + (z1 - z0) * out;
        const [ex, ey] = isMobile() ? [1130, 400] : [800, 520]; // the closing shot: whole route (phones: the last stretch)
        const cx = pt.x + (ex - pt.x) * out;
        const cy = pt.y + (ey - pt.y) * out;
        cam.setAttribute("transform", `translate(800 520) scale(${z}) translate(${-cx} ${-cy})`);
        etaEl.textContent = String(Math.max(18, Math.round(26 - 8 * drive.p)));
      };
      placeVan();
      const DRIVE = 6.5; // scroll units for the route
      tl.addLabel("route", "away")
        .fromTo(route, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: "power2.inOut" }, "route")
        .to(yard, { autoAlpha: 0, duration: 0.6 }, "route+=0.5")
        .fromTo(
          plane,
          { rotateX: 0, scale: 1.35 },
          { rotateX: () => (isMobile() ? 40 : 50), scale: 1, duration: 1.6, ease: "power2.inOut" },
          "route",
        )
        .fromTo(q(".v2-route__eta"), { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "route+=0.8")
        .fromTo(drive, { p: 0 }, { p: 1, duration: DRIVE, ease: "sine.inOut", onUpdate: placeVan, immediateRender: false }, "route+=0.6")
        .fromTo(
          q(".v2-route__home-pulse"),
          { scale: 0.4, autoAlpha: 0.9 },
          { scale: 2.4, autoAlpha: 0, duration: 1.2, ease: "power1.out", stagger: 0.3, immediateRender: false },
          `route+=${0.6 + DRIVE - 0.4}`,
        )
        .to(q(".v2-route__count"), { autoAlpha: 0, duration: 0.2 }, `route+=${0.6 + DRIVE - 0.2}`)
        .fromTo(q(".v2-route__eta i"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, `route+=${0.6 + DRIVE - 0.1}`)
        .to({}, { duration: 0.6 });
      }

      // ===== pace map: how many screens of scroll each stretch of the story gets =====
      // Scroll drives the story 1:1 (Lenis alone does the smoothing, like any native page); what
      // changes is only the distance: a stretch where a lot happens gets more scroll, so the pace
      // feels even from the 3D mark to the ride-off. [timeline time, screens of scroll to get there]
      const at = (l: string, o = 0) => tl.labels[l] + o;
      // Balanced by measurement (tools/audit/pace.mjs: visual change per equal scroll step), so the
      // film never rushes and the app beats never drag.
      const PACE: [number, number][] = [
        [0, 0],
        [LOGO * 0.5, 1.0], // the mark turns to face you
        [LOGO * 0.8, 1.1], // …closes in on its square opening
        [LOGO * 0.9, 1.1], // …passes through it (a full-screen change: give it room)
        [LOGO, 0.5], // …into the sky
        [at("sky"), 0.6], // headline lands on the clouds
        [at("fly", 3.5), 2.4], // fall through the clouds
        [at("leak"), 2.0], // over the blocks, up to the open window on the 8th floor
        [at("leak", 5), 2.7], // through the window into the bathroom
        [at("water"), 2.3], // to him at the basin
        [at("water", 2.6), 1.0], // the leak close-up
        [at("wake"), 1.5], // he lifts his phone, the camera leans over his shoulder
        [at("zoom"), 1.2], // his screen wakes: the Ora splash
        [at("zoom", ZOOM * 0.45), 1.6], // the scroll closes in on his screen, at his angle
        [at("open"), 2.0], // …into the star and through its centre
        [at("app", 1.3), 1.2], // Step 01 opens out of it
        [at("app", 1.9), 0.8], // Services
        [at("plumb"), 1.0], // the list scrolls
        [at("openPlumb"), 0.8], // Plumbing lifts off, selected
        [at("tapFix", 0.6), 0.9], // its screen, the fixture
        [at("date", 1.8), 0.8], // the date card lands
        [at("review"), 0.7], // slot, select
        [at("review", 3), 1.2], // the order cards unfold
        [at("review", 4.3), 0.3], // your choices light up, confirm
        [at("done", 2.3), 1.1], // booked: seal and confetti
        [at("conf", 0.8), 0.8], // the confirmed order, with your technician on it
        [at("techZoom"), 0.6], // his thumbnail
        [at("techZoom", AV_ZOOM), 2.0], // his photo grows out of its card: it opens into Step 06
        [at("tech", 4.6), 1.4], // he smiles and folds his arms
        [at("accept", 1.2), 1.0], // the stage: his van parked on the road
        [at("accept", 1.2 + HI), 2.0], // he walks in from the right, waves hello, the phone buzzes
        [at("ride"), 1.6], // he reads the job and accepts
        [at("away"), 1.6], // to the driver's door, in, door shut
        [tl.duration(), 2.6], // he drives off, smaller and smaller, gone
      ];
      const cum: number[] = [];
      PACE.reduce((a, [, sc]) => (cum.push(a + sc), a + sc), 0);
      const TOTAL = cum[cum.length - 1];
      const timeAt = (screens: number) => {
        let i = 1;
        while (i < PACE.length - 1 && cum[i] < screens) i++;
        const k = gsap.utils.clamp(0, 1, (screens - cum[i - 1]) / (cum[i] - cum[i - 1] || 1));
        return PACE[i - 1][0] + (PACE[i][0] - PACE[i - 1][0]) * k;
      };
      const screensAt = (t: number) => {
        let i = 1;
        while (i < PACE.length - 1 && PACE[i][0] < t) i++;
        const k = gsap.utils.clamp(0, 1, (t - PACE[i - 1][0]) / (PACE[i][0] - PACE[i - 1][0] || 1));
        return cum[i - 1] + (cum[i] - cum[i - 1]) * k;
      };
      // a refresh (or any jump with events suppressed) returns to the current time with events suppressed, which skips the per-frame
      // painters (the splash zoom, his photo opening out): re-run them for wherever the story now is
      const syncFrames = () => {
        const t = tl.time();
        paintCounts();
        if (t >= tl.labels.zoom && t <= tl.labels.open) zoomFrame();
        avFrame();
      };
      const progressBar = q(".jr__progress i");
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${innerHeight * TOTAL}`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          tl.time(timeAt(self.progress * TOTAL));
          syncFrames(); // cheap; keeps the painted frames true to the timeline whatever happened before
          gsap.set(progressBar, { scaleX: self.progress });
        },
      });
      // resize: rebuild function-based values from the start state, then return to where we were
      const onRefreshInit = () => {
        tl.time(0, true);
        tl.invalidate();
      };
      const onRefresh = () => {
        tl.time(timeAt(st.progress * TOTAL), true);
        syncFrames();
      };
      ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
      ScrollTrigger.addEventListener("refresh", onRefresh);
      tl.time(0);
      ScrollTrigger.refresh();
      syncFrames();
      // audit hook: scripts seek to story moments by label (scroll position of a timeline time)
      Object.assign(window, {
        __oraJourney: tl,
        __oraSync: syncFrames,
        __oraSeekY: (t: number) => st.start + screensAt(t) * innerHeight,
      });

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
        ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
        ScrollTrigger.removeEventListener("refresh", onRefresh);
        clearTimeout(clipTimer);
        removeEventListener("ora:ready", go);
        removeEventListener("resize", applyFall);
        removeEventListener("resize", placeScreen);
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
      className="jr v2-jr"
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
        <div className="jr__filmscreen">
          {/* Figma launch sequence: iOS home with the Ora icon → 01 A → 01 B */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async"
            className="jr__fs jr__fs--icon"
            src="/app/ios-icon.webp"
            alt=""
          />
          {/* the Ora app icon, large and crisp (the Figma home has it at 72 px, a blur at this size) */}
          <div className="jr__fs jr__fs-home">
            <span className="jr__fs-home-mask" />
            <span className="jr__fs-appicon">
              <Mark />
            </span>
            <span className="jr__fs-applabel">Ora</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async" className="jr__fs jr__fs--a" src="/app/splash-a.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async" className="jr__fs jr__fs--b" src="/app/splash-b.webp" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img fetchPriority="low" decoding="async" className="jr__fs jr__fs--c" src="/app/splash-c.webp" alt="" />
          <span className="jr__fs-tap" aria-hidden />
          {/* the zoom into the splash's star, drawn per frame at screen resolution */}
          <canvas className="jr__fs jr__fs-zoom" />
        </div>
      </div>
      {/* the splash's star as live vector geometry, in screen space over his phone */}
      <canvas className="jr__starcv" aria-hidden />
      <div className="jr__env" aria-hidden />
      <div className="jr__tint" aria-hidden />
      <div className="jr__shade" aria-hidden />

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
      <div className="v2-clients" aria-label="Communities that trust Ora">
        <span className="v2-clients__label glass glass--dark">
          <Mark /> Trusted across Dubai
        </span>
        <div className="v2-clients__rail">
          <ul className="v2-clients__track">
            {COMMUNITIES.map((c) => (
              <li key={c}>
                <span>{c}</span>
                <Mark />
              </li>
            ))}
          </ul>
        </div>
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
                src="/v2/app/date-card.webp"
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
            s === "splash-a" ? (
              // the app starting: the Ora splash, the star you zoom through into the app
              <div key={s} className="jr__scr jr__splash">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img decoding="async" src="/app/splash-a.webp" alt="" />
                {/* the zoom is drawn here: the splash and a vector copy of its star, at any scale */}
                <canvas className="jr__splash-cv" />
              </div>
            ) : s === "home" ? (
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
              // Plumbing – Order Review: Figma base + the customer's order cards, live on the glass
              <div key={s} className="jr__scr jr__review">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img fetchPriority="low" decoding="async" src="/app/review-base.webp" alt="" />
                {RV_CARDS.map((c) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    fetchPriority="low"
                    decoding="async"
                    key={c.k}
                    className="jr__rv-card"
                    src={`/app/pr-${c.k}.webp`}
                    alt=""
                    style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
                  />
                ))}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img fetchPriority="low" decoding="async" key={s} className="jr__scr" src={V2_SCREEN.has(s) ? `/v2/app/${s}.webp` : `/app/${s}.webp`} alt="" />
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
            className="jr__qcard jr__qcard--tech glass"
            data-d="1.3"
            style={{ left: "calc(100% + 44px)", top: "4%" }}
          >
            <i className="jr__tick">✓</i> Background-checked
          </div>
          <div
            className="jr__qcard jr__qcard--tech glass"
            data-d="0.9"
            style={{ left: "calc(100% + 110px)", top: "50%" }}
          >
            <small>Workmanship guarantee</small>
            <b>
              <span data-count="30">0</span> days
            </b>
          </div>
          <div
            className="jr__qcard jr__qcard--tech glass"
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
            className="jr__qcard jr__qcard--tech glass glass--dark"
            data-d="1.5"
            style={{ left: "calc(100% + 44px)", top: "74%" }}
          >
            <small>Employment</small>
            <b>On Ora payroll</b>
            <small>Not a marketplace</small>
          </div>
        </div>

      </div>

      {/* ---------- chapter 07: one rendered scene on its own warm stage: his van parked on the road, he walks in
          and waves, takes the job, gets in at the driver's door and drives off left, behind the chapter card ---------- */}
      <div className="v2-stage" aria-hidden>
        {/* one wide shot for the whole chapter: he walks in and waves, takes the job, gets in, drives off left */}
        <div className="v2-stage__box">
          <canvas className="v2-stage__cv v2-yard__hellocv" />
          <canvas className="v2-stage__cv jr__avcv" />
          <canvas className="v2-stage__cv v2-yard__gincv" />
          <canvas className="v2-stage__cv v2-yard__drivecv" />
          <canvas className="v2-stage__cv v2-yard__dust" />
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
      </div>

      {/* ---------- the route: his van on the community plan, to your door (out of the flow for now) ---------- */}
      {SHOW_ROUTE && (
      <div className="v2-route" aria-hidden>
        <div className="v2-route__plane">
          <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="v2-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <g className="v2-route__cam">
              <rect x="-1200" y="-1200" width="4000" height="3400" fill="#F4E6CC" />
              <ellipse cx="1150" cy="430" rx="150" ry="92" fill="#C9D6B1" />
              <ellipse cx="300" cy="960" rx="220" ry="70" fill="#C9D6B1" />
              {ROADS.map((d) => (
                <g key={d}>
                  <path d={d} fill="none" stroke="#E2CDAA" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={d} fill="none" stroke="#FFFBF2" strokeWidth={38} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
              {BLOCKS.map(([x, y, w, h, k], i) =>
                k === "p" ? (
                  <rect key={i} x={x} y={y} width={w} height={h} rx={10} fill="#AAC9DF" />
                ) : (
                  <g key={i}>
                    <rect x={x + 6} y={y + 10} width={w} height={h} rx={k === "a" ? 10 : 6} fill="#DCC6A2" />
                    <rect x={x} y={y} width={w} height={h} rx={k === "a" ? 10 : 6} fill={k === "a" ? "#FBF1DC" : "#F7E9CF"} />
                    {k === "t" &&
                      Array.from({ length: Math.floor(w / 40) - 1 }, (_, j) => (
                        <line key={j} x1={x + (j + 1) * 40} y1={y + 6} x2={x + (j + 1) * 40} y2={y + h - 6} stroke="#E6D2B0" strokeWidth={2} />
                      ))}
                  </g>
                ),
              )}
              {[
                [1080, 400], [1130, 470], [1200, 420], [1240, 470], [1100, 450], [250, 950], [330, 975], [380, 940],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={14} fill="#ABBD94" />
              ))}
              <path d={ROUTE} className="v2-route__path" fill="none" stroke="#47150F" strokeOpacity={0.22} strokeWidth={8} strokeDasharray="2 14" strokeLinecap="round" />
              <path d={ROUTE} className="v2-route__done" fill="none" stroke="#47150F" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              {/* the Ora hub */}
              <g transform="translate(140 742)">
                <circle r={26} fill="#47150F" />
                <g transform="translate(-11 -11) scale(0.34)" fill="#FCDDA1">
                  <path transform="translate(-58 0)" d={STAR_PATH} fillRule="evenodd" />
                </g>
              </g>
              {/* your home */}
              <path d="M 1240 290 L 1240 244" stroke="#FFFBF2" strokeWidth={14} strokeLinecap="round" />
              <g transform="translate(1240 236)">
                <circle className="v2-route__home-pulse" r={30} fill="none" stroke="#AE554C" strokeWidth={4} />
                <circle className="v2-route__home-pulse" r={30} fill="none" stroke="#AE554C" strokeWidth={4} />
                <circle r={30} fill="#FFFBF2" stroke="#47150F" strokeWidth={5} />
                <path d="M -13 3 L 0 -11 L 13 3 L 13 14 L -13 14 Z" fill="#47150F" />
              </g>
              {/* his van, top-down, in Ora brown */}
              <g className="v2-route__van">
                <g transform="scale(1.45)">
                <ellipse cx={3} cy={8} rx={30} ry={15} fill="rgba(40,16,8,0.35)" filter="url(#v2-soft)" />
                <rect x={-28} y={-14} width={56} height={28} rx={8} fill="#4A2418" />
                <rect x={10} y={-12} width={12} height={24} rx={4} fill="#1E120D" />
                <rect x={-22} y={-10} width={28} height={20} rx={4} fill="#5C3022" />
                <g transform="translate(-14.5 -6) scale(0.19)" fill="#FCDDA1">
                  <path transform="translate(-58 0)" d={STAR_PATH} fillRule="evenodd" />
                </g>
                <rect x={25} y={-12} width={3} height={6} rx={1.5} fill="#FFF3D6" />
                <rect x={25} y={6} width={3} height={6} rx={1.5} fill="#FFF3D6" />
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div className="v2-route__fog" />
        <div className="v2-route__eta glass">
          <span className="v2-route__eta-icon">
            <Mark />
          </span>
          <span>
            <small>
              Paolo · Ora van · <span className="v2-live">Live</span>
            </small>
            <strong>
              <span className="v2-route__count">
                Arriving in <b>26</b> min
              </span>
              <i>Arriving now</i>
            </strong>
          </span>
        </div>
      </div>
      )}

      {/* the star's centre, full screen: Step 01 opens out of it */}
      <div className="jr__hole" aria-hidden />

      <div className="jr__app-ui">
        <div className="jr__chapterbg glass" aria-hidden />
        {/* one title for the whole booking walkthrough, held in place while the steps change */}
        <h2 className="v2-lefthead display">
          <span className="v2-lefthead__l">Your Service</span>
          <span className="v2-lefthead__l">in a Few Steps</span>
        </h2>
        {CHAPTERS.map((c) => (
          <div className="jr__chapter jr__chapter--text" key={c.k}>
            <span className="eyebrow">
              <Mark /> Step {c.k} · {c.eyebrow}
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
