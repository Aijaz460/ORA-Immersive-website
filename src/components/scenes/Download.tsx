"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { UNIT_VH, applyPhoneScale, isMobile } from "@/lib/stage";
import { SERVICES } from "@/lib/services";
import Phone from "../ui/Phone";
import Lines from "../ui/Lines";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Exact Figma exports (Mobile UI Screens), 2×.
const Screen = ({ name }: { name: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img loading="lazy" decoding="async" className="dl__scr" src={`/app/${name}.webp`} alt="" />
);

const Apple = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      fill="currentColor"
      d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.3-3.6zM14 5.2c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"
    />
  </svg>
);
const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M4 2.8v18.4c0 .4.4.7.8.5l15.8-9.2c.4-.2.4-.8 0-1L4.8 2.3c-.4-.2-.8.1-.8.5z" />
  </svg>
);

// Immersive app-download finale: dark red, three phones fanning up out of the dark.
export default function Download() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    applyPhoneScale();
    const el = root.current!;
    const q = gsap.utils.selector(el);

    const ctx = gsap.context(() => {
      const spread = () => (isMobile() ? 0.55 : 1);
      // copy reveals while the section scrolls in, so it never arrives as an empty red frame
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 75%", end: "top 10%", scrub: true } })
        .from(q(".dl__copy .line > span"), { yPercent: 115, stagger: 0.1, duration: 0.8, ease: "power3.out" }, 0)
        .from(
          q(".dl__copy p, .dl__copy .eyebrow, .dl__stores > *, .dl__meta"),
          { autoAlpha: 0, y: 24, stagger: 0.08, duration: 0.7 },
          0.3,
        );
      const units = 5;
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${innerHeight * units * UNIT_VH}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(q(".dl__giant"), { scale: 0.7, yPercent: 10 }, { scale: 1.05, yPercent: -6, duration: units })

        .fromTo(q(".dl__ph--c"), { y: () => innerHeight * 0.9, rotateX: 30 }, { y: 0, rotateX: 0, duration: 2, ease: "power3.out" }, 0.3)
        .fromTo(
          q(".dl__ph--l"),
          { y: () => innerHeight, x: 0, rotate: 0 },
          { y: () => innerHeight * 0.06, x: () => -230 * spread(), rotate: -11, duration: 2.2, ease: "power3.out" },
          0.6,
        )
        .fromTo(
          q(".dl__ph--r"),
          { y: () => innerHeight, x: 0, rotate: 0 },
          { y: () => innerHeight * 0.06, x: () => 230 * spread(), rotate: 11, duration: 2.2, ease: "power3.out" },
          0.6,
        )
        .fromTo(q(".dl__halo"), { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 2 }, 0.3)
        .to(q(".dl__phones"), { y: -40, duration: 1.6 }, 3.2);

      // gentle idle float after the fan is open
      gsap.to(q(".dl__ph--c .phone"), { y: -10, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(q(".dl__ph--l .phone"), { y: 8, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(q(".dl__ph--r .phone"), { y: -8, duration: 3.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, el);
    return () => ctx.revert();
  }, []);

  const marquee = [...SERVICES.map((s) => s.name), "2-hour slots", "Fixed prices", "Job reports"];

  return (
    <section className="dl" id="download" ref={root} data-header="light" aria-label="Download the Ora app">
      <div className="dl__giant" aria-hidden>
        Ora
      </div>
      <div className="dl__halo" aria-hidden />

      <div className="dl__copy">
        <span className="eyebrow">
          <Mark /> Available on iOS &amp; Android
        </span>
        <h2 className="display">
          <Lines>{["Your home,", "<em>perfectly</em> managed."]}</Lines>
        </h2>
        <p>Download Ora and book top-rated, in-house professionals in under a minute.</p>
        <div className="dl__stores">
          <a className="store" href="#" data-magnetic data-cursor="iOS" aria-label="Download on the App Store">
            <Apple />
            <span>
              <small>Download on the</small>
              <b>App Store</b>
            </span>
          </a>
          <a className="store" href="#" data-magnetic data-cursor="Android" aria-label="Get it on Google Play">
            <Play />
            <span>
              <small>Get it on</small>
              <b>Google Play</b>
            </span>
          </a>
        </div>
        <div className="dl__meta">
          <span>
            <b>4.9★</b> average rating
          </span>
          <span>
            <b>500+</b> jobs booked
          </span>
          <span>
            <b>25+</b> awards
          </span>
        </div>
      </div>

      <div className="dl__phones" style={{ perspective: "1800px" }}>
        <div className="dl__ph dl__ph--l">
          <Phone>
            <Screen name="home" />
          </Phone>
        </div>
        <div className="dl__ph dl__ph--r">
          <Phone>
            <Screen name="confirmed" />
          </Phone>
        </div>
        <div className="dl__ph dl__ph--c">
          <Phone>
            <Screen name="splash-c" />
          </Phone>
        </div>
      </div>

      <div className="dl__marquee" aria-hidden>
        <div className="dl__track">
          {[...marquee, ...marquee].map((m, i) => (
            <span key={i}>
              {m} <Mark />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
