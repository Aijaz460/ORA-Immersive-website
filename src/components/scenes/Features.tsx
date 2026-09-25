"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { prefersReducedMotion } from "@/lib/stage";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

// Every card is a tiny live demo of a real ORA app flow (Figma "Mobile UI Screens"),
// running on its own loop while it is on screen. Each glass card carries its own app pastel.

const QUERIES = [
  { q: "My kitchen sink is leaking", svc: "Plumbing", opt: "Leak repairs", img: "/img/tools/plumbing.webp", bg: "#C5D9C0" },
  { q: "The AC is blowing warm air", svc: "AC & Mechanical", opt: "AC service", img: "/img/tools/ac-hammer.webp", bg: "#CBBDE2" },
  { q: "Ants in the pantry again", svc: "Pest Control", opt: "Ant treatment", img: "/img/tools/pest.webp", bg: "#D5DAF4" },
];
const REPORT = ["Old tap removed", "New mixer installed", "Leak test passed", "Work area cleaned"];
const NOTES = [
  { t: "Booking confirmed", s: "Fixture installation · Tue 13:00" },
  { t: "Muhsen is on his way", s: "Arriving in 12 min · Track live" },
  { t: "Your job report is ready", s: "4 photos · 2 parts used" },
];
const DATES = [
  ["Mon", "3"],
  ["Tue", "4"],
  ["Wed", "5"],
  ["Thu", "6"],
  ["Fri", "7"],
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
      const loop = (card: string, build: (tl: gsap.core.Timeline, c: (s: string) => HTMLElement[]) => void) => {
        const node = q(card)[0];
        const c = gsap.utils.selector(node);
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, paused: true });
        build(tl, c);
        loops.push(tl);
        ScrollTrigger.create({
          trigger: node,
          start: "top 95%",
          end: "bottom 5%",
          onToggle: (self) => (self.isActive && !reduce ? tl.play() : tl.pause()),
        });
      };

      // 1 · AI assistant: type a problem, get the right service
      loop(".fc--ai", (tl, c) => {
        const input = c("[data-input]")[0];
        const sug = c(".ai__sug")[0];
        QUERIES.forEach((item) => {
          const s = { n: 0 };
          tl.set(sug, { autoAlpha: 0, y: 16 })
            .call(() => {
              (c(".ai__svc")[0] as HTMLElement).textContent = item.svc;
              (c(".ai__opt")[0] as HTMLElement).textContent = item.opt;
              (c(".ai__thumb img")[0] as HTMLImageElement).src = item.img;
              (c(".ai__thumb")[0] as HTMLElement).style.background = item.bg;
            })
            .to(s, {
              n: item.q.length,
              duration: item.q.length * 0.045,
              ease: "none",
              onUpdate: () => (input.textContent = item.q.slice(0, Math.round(s.n))),
            })
            .to(c(".ai__think")[0], { autoAlpha: 1, duration: 0.2 })
            .to(c(".ai__think i"), { y: -4, duration: 0.25, stagger: 0.1, yoyo: true, repeat: 3 })
            .to(c(".ai__think")[0], { autoAlpha: 0, duration: 0.2 })
            .to(sug, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" })
            .to(c(".ai__book")[0], { scale: 0.92, duration: 0.12, delay: 0.8 })
            .to(c(".ai__book")[0], { scale: 1, duration: 0.2 })
            .to([sug], { autoAlpha: 0, y: -10, duration: 0.4, delay: 0.9 })
            .to(s, { n: 0, duration: 0.4, onUpdate: () => (input.textContent = item.q.slice(0, Math.round(s.n))) }, "<");
        });
      });

      // 2 · live tracking: route draws, the van drives, ETA counts down
      loop(".fc--track", (tl, c) => {
        const eta = { v: 12 };
        const etaEl = c("[data-eta]")[0];
        tl.set(c(".tr__arrived")[0], { autoAlpha: 0, scale: 0.8 })
          .set(eta, { v: 12 })
          .fromTo(c(".tr__route")[0], { strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" })
          .fromTo(c(".tr__van")[0], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })
          .to(c(".tr__van")[0], {
            duration: 4,
            ease: "sine.inOut",
            motionPath: { path: c(".tr__route")[0] as unknown as SVGPathElement, align: c(".tr__route")[0] as unknown as SVGPathElement, alignOrigin: [0.5, 0.5], autoRotate: false },
          })
          .to(eta, { v: 0, duration: 4, ease: "sine.inOut", onUpdate: () => (etaEl.textContent = String(Math.round(eta.v))) }, "<")
          .to(c(".tr__arrived")[0], { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" })
          .to(c(".tr__home")[0], { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 }, "<")
          .to({}, { duration: 1.2 });
      });

      // 3 · OTP sign-in
      loop(".fc--otp", (tl, c) => {
        const boxes = c(".otp__box");
        tl.set(boxes, { textContent: "" }).set(c(".otp__ok")[0], { autoAlpha: 0, y: 8 }).set(boxes, { borderColor: "rgba(71,21,15,.14)" });
        "980945".split("").forEach((d, i) => {
          tl.set(boxes[i], { textContent: d, borderColor: "#AE554C" }, `+=${i ? 0.18 : 0.4}`).from(boxes[i], { scale: 1.3, duration: 0.25 }, "<");
        });
        tl.to(boxes, { borderColor: "#ABBD94", backgroundColor: "rgba(171,189,148,.2)", duration: 0.3, stagger: 0.04 }, "+=0.2")
          .to(c(".otp__ok")[0], { autoAlpha: 1, y: 0, duration: 0.4 })
          .to({}, { duration: 1.4 })
          .to(boxes, { backgroundColor: "rgba(255,255,255,.6)", duration: 0.3 });
      });

      // 4 · reschedule
      loop(".fc--res", (tl, c) => {
        const chips = c(".rs__chip");
        const pill = c(".rs__pill")[0];
        const at = (i: number) => chips[i].offsetLeft;
        tl.set(pill, { x: () => at(1) })
          .set(c(".rs__toast")[0], { autoAlpha: 0, y: 12 })
          .to(pill, { x: () => at(3), duration: 0.8, ease: "expo.inOut" }, "+=0.8")
          .to(c(".rs__toast")[0], { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" })
          .to({}, { duration: 1.6 })
          .to(c(".rs__toast")[0], { autoAlpha: 0, duration: 0.3 })
          .to(pill, { x: () => at(1), duration: 0.8, ease: "expo.inOut" });
      });

      // 5 · notifications stack
      loop(".fc--note", (tl, c) => {
        const notes = c(".nt");
        tl.set(notes, { autoAlpha: 0, y: -40, scale: 1 });
        notes.forEach((n, i) => {
          tl.to(n, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" }, i ? "+=0.9" : 0.3);
          if (i) tl.to(notes.slice(0, i), { y: (k) => (i - k) * 64, scale: (k) => 1 - (i - k) * 0.05, autoAlpha: (k) => 1 - (i - k) * 0.12, duration: 0.6, ease: "power3.out" }, "<");
        });
        tl.to(notes, { autoAlpha: 0, y: "+=20", duration: 0.5, stagger: 0.05 }, "+=1.6");
      });

      // 6 · job report
      loop(".fc--rep", (tl, c) => {
        const rows = c(".rp__row");
        tl.set(rows, { autoAlpha: 0.72 }).set(c(".rp__tick"), { scale: 0 }).set(c(".rp__sent")[0], { autoAlpha: 0, y: 10 });
        rows.forEach((r, i) => {
          tl.to(r, { autoAlpha: 1, duration: 0.25 }, i ? "+=0.35" : 0.4).to(c(".rp__tick")[i], { scale: 1, duration: 0.35, ease: "back.out(2.5)" }, "<");
        });
        tl.from(c(".rp__ph"), { scale: 0.6, autoAlpha: 0, stagger: 0.08, duration: 0.4, ease: "back.out(2)" }, "+=0.2")
          .to(c(".rp__sent")[0], { autoAlpha: 1, y: 0, duration: 0.4 })
          .to({}, { duration: 1.5 });
      });

      // 7 · saved addresses
      loop(".fc--addr", (tl, c) => {
        const pills = c(".ad__pill");
        const pins = c(".ad__pin");
        [0, 1, 2, 0].forEach((i, k) => {
          tl.call(() => pills.forEach((p, j) => p.classList.toggle("is-on", j === i)), [], k ? "+=1.1" : 0.2)
            .to(pins, { autoAlpha: 0.25, scale: 0.7, y: 0, duration: 0.3 }, "<")
            .fromTo(pins[i], { y: -26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, ease: "bounce.out" }, "<");
        });
      });

      // 8 · rebook
      loop(".fc--book", (tl, c) => {
        const btn = c(".rb__btn")[0];
        tl.set(btn, { backgroundColor: "#2D2D2D" })
          .call(() => (btn.querySelector("span")!.textContent = "Book again"))
          .set(c(".rb__done")[0], { autoAlpha: 0, y: 10 })
          .to(btn, { scale: 0.93, duration: 0.14 }, "+=1.2")
          .to(btn, { scale: 1, duration: 0.2 })
          .to(btn, { backgroundColor: "#4D4721", duration: 0.3 }, "<")
          .call(() => (btn.querySelector("span")!.textContent = "Booked ✓"))
          .to(c(".rb__done")[0], { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" })
          .to({}, { duration: 1.6 });
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
          Every card below is the real app, running on its own. No phone tag, no vague windows, no surprises.
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

        <article className="fc fc--ai" data-cursor="Ask Ora">
          <header>
            <small>Ora assistant</small>
            <h3>Just tell Ora what&apos;s wrong</h3>
          </header>
          <div className="ai">
            <div className="ai__input">
              <Mark />
              <span data-input />
              <i className="caret" />
            </div>
            <div className="ai__think" aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <div className="ai__sug">
              <span className="ai__thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src="/img/tools/plumbing.webp" alt="" />
              </span>
              <span className="ai__txt">
                <small>Suggested</small>
                <b className="ai__svc">Plumbing</b>
                <span className="ai__opt">Leak repairs</span>
              </span>
              <span className="ai__book">Book</span>
            </div>
          </div>
        </article>

        <article className="fc fc--track" data-cursor="Live">
          <header>
            <small>Live tracking</small>
            <h3>Watch your technician arrive</h3>
          </header>
          <div className="tr">
            <svg className="tr__map" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <rect width="400" height="300" fill="#EFE6D6" />
              <path d="M0 80 H400 M0 190 H400 M0 260 H400 M70 0 V300 M190 0 V300 M310 0 V300" stroke="#fff" strokeWidth="14" />
              <path d="M0 130 L400 110 M120 0 L150 300 M250 0 L240 300" stroke="#fff" strokeWidth="6" />
              <rect x="205" y="200" width="90" height="46" rx="6" fill="#DCE8D6" />
              <rect x="85" y="95" width="90" height="80" rx="6" fill="#E5DCCB" />
              <path className="tr__route" d="M40 268 L70 268 L70 190 L190 190 L190 80 L302 80" fill="none" stroke="#AE554C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="600" />
            </svg>
            <span className="tr__van" aria-hidden>
              <Mark />
            </span>
            <span className="tr__home" aria-hidden />
            <div className="tr__eta">
              <small>Muhsen · Plumbing</small>
              <b>
                <span data-eta>12</span> min
              </b>
            </div>
            <span className="tr__arrived">Arrived ✓</span>
          </div>
        </article>

        <article className="fc fc--otp">
          <header>
            <small>Sign in</small>
            <h3>Your number is your account</h3>
          </header>
          <div className="otp">
            <span className="otp__num">+971 50 123 4567</span>
            <div className="otp__row">
              {Array.from({ length: 6 }).map((_, i) => (
                <span className="otp__box" key={i} />
              ))}
            </div>
            <span className="otp__ok">Verified ✓</span>
          </div>
        </article>

        <article className="fc fc--res">
          <header>
            <small>Reschedule</small>
            <h3>Plans change. Slots move.</h3>
          </header>
          <div className="rs">
            <div className="rs__row">
              <span className="rs__pill" aria-hidden />
              {DATES.map(([d, n]) => (
                <span className="rs__chip" key={d}>
                  <small>{d}</small>
                  <b>{n}</b>
                </span>
              ))}
            </div>
            <span className="rs__toast">Rescheduled · Thu 6 Nov, 13:00</span>
            <small className="rs__note">Free up to 12 hours before your slot</small>
          </div>
        </article>

        <article className="fc fc--note">
          <header>
            <small>Notifications</small>
            <h3>Every update, the moment it happens</h3>
          </header>
          <div className="nts">
            {NOTES.map((n) => (
              <div className="nt" key={n.t}>
                <span className="nt__ic">
                  <Mark />
                </span>
                <span>
                  <b>{n.t}</b>
                  <small>{n.s}</small>
                </span>
                <em>now</em>
              </div>
            ))}
          </div>
        </article>

        <article className="fc fc--rep">
          <header>
            <small>Job report</small>
            <h3>A written report after every visit</h3>
          </header>
          <div className="rp">
            {REPORT.map((r) => (
              <div className="rp__row" key={r}>
                <span className="rp__tick">✓</span>
                {r}
              </div>
            ))}
            <div className="rp__photos">
              {["#C5D9C0", "#FCDDA1", "#AAC9DF", "#E1756B"].map((c) => (
                <span className="rp__ph" key={c} style={{ background: c }} />
              ))}
              <span className="rp__sent">Sent to your inbox ✓</span>
            </div>
          </div>
        </article>

        <article className="fc fc--addr">
          <header>
            <small>Saved addresses</small>
            <h3>Home, villa, office. One tap.</h3>
          </header>
          <div className="ad">
            <div className="ad__pills">
              <span className="ad__pill is-on">Home</span>
              <span className="ad__pill">Villa</span>
              <span className="ad__pill">Office</span>
            </div>
            <div className="ad__map">
              <span className="ad__pin" style={{ left: "22%", top: "40%" }} />
              <span className="ad__pin" style={{ left: "58%", top: "62%" }} />
              <span className="ad__pin" style={{ left: "80%", top: "30%" }} />
            </div>
          </div>
        </article>

        <article className="fc fc--book">
          <header>
            <small>Rebook</small>
            <h3>Loved the last visit? Book it again.</h3>
          </header>
          <div className="rb">
            <div className="rb__card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src="/img/tools/cleaning.webp" alt="" />
              <div>
                <b>Deep cleaning</b>
                <small>2 weeks ago · AED 90</small>
              </div>
            </div>
            <span className="rb__btn">
              <span>Book again</span>
            </span>
            <span className="rb__done">Same team · Tue 11 Nov, 10:00</span>
          </div>
        </article>
      </div>
    </section>
  );
}
