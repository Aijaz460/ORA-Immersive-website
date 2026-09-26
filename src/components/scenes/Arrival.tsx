"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { UNIT_VH } from "@/lib/stage";
import Lines from "../ui/Lines";
import { Mark } from "../ui/Logo";

gsap.registerPlugin(ScrollTrigger);

// Figma storyboard: "phone on a desk with a notification that the technician is on his way".
// A Higgsfield top-down still; the live lock-screen UI sits exactly on the phone's glass.
export default function Arrival() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const eta = q("[data-eta]")[0];
      const state = { eta: 18 };
      const units = 6;
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
          onUpdate: () => (eta.textContent = String(Math.max(0, Math.round(state.eta)))),
        })
        .fromTo(q(".ar__scene"), { scale: 1.5, rotate: -4 }, { scale: 1, rotate: 0, duration: 2.4, ease: "power2.out" })
        .fromTo(q(".ar__shadow"), { xPercent: -8, yPercent: 4 }, { xPercent: 6, yPercent: -3, duration: units }, 0)
        .from(q(".ar__copy"), { autoAlpha: 0, y: 40, duration: 0.7, ease: "power3.out" }, 0.5)
        .from(q(".ar__copy .line > span"), { yPercent: 115, stagger: 0.1, duration: 0.8, ease: "power3.out" }, 0.8)
        .from(q(".ar__copy p, .ar__copy .eyebrow"), { autoAlpha: 0, y: 20, duration: 0.7 }, 1)
        // the screen wakes, then the notification drops in
        .to(q(".ar__screen"), { backgroundColor: "#1b120e", duration: 0.3 }, 1.2)
        .from(q(".ar__lock"), { autoAlpha: 0, duration: 0.5 }, 1.3)
        .from(q(".ar__note--1"), { yPercent: -140, autoAlpha: 0, duration: 0.7, ease: "back.out(1.4)" }, 1.8)
        .to(state, { eta: 12, duration: 1.4 }, 2.4)
        .from(q(".ar__note--2"), { yPercent: -140, autoAlpha: 0, duration: 0.7, ease: "back.out(1.4)" }, 3.6)
        .to(q(".ar__note--1"), { scale: 0.94, y: 6, autoAlpha: 0.7, duration: 0.5 }, 3.6)
        .to(state, { eta: 0, duration: 0.8 }, 3.8)
        .to({}, { duration: 0.8 });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="ar" ref={root} aria-label="Live updates until your technician arrives">
      <div className="ar__viewport">
        <div className="ar__scene">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" className="ar__img" src="/img/desk-phone.webp" alt="An Ora notification on a phone lying on a kitchen counter" />
          <div className="ar__shadow" aria-hidden />
          <div className="ar__screen">
            <div className="ar__lock">
              <span className="ar__date">Tuesday, 4 November</span>
              <span className="ar__time">12:48</span>
            </div>
            <div className="ar__note ar__note--1">
              <span className="ar__app">
                <Mark /> ORA · now
              </span>
              <b>Muhsen is on his way</b>
              <span>
                Arriving in <span data-eta>18</span> min · Track live
              </span>
            </div>
            <div className="ar__note ar__note--2">
              <span className="ar__app">
                <Mark /> ORA · now
              </span>
              <b>Your technician has arrived</b>
              <span>Fixture installation · 13:00 – 15:00</span>
            </div>
          </div>
        </div>
      </div>
      <div className="ar__copy">
        <span className="eyebrow">
          <Mark /> Live from dispatch to doorstep
        </span>
        <h2 className="display">
          <Lines>{["Sit back.", "Help is <em>on the way.</em>"]}</Lines>
        </h2>
        <p>Two-hour windows we actually keep, live tracking, and a nudge the moment your technician is at the door.</p>
      </div>
    </section>
  );
}
