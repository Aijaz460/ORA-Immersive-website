"use client";

import { useState } from "react";
import Logo from "./ui/Logo";

// visionOS-style floating glass capsule. `menu`: on phones the links fold into a menu button (Variant 2).
export default function Header({ menu = false }: { menu?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className={`header${menu ? " header--menu" : ""}${open ? " is-open" : ""}`}>
      <a className="skip" href="#services">
        Skip the story
      </a>
      <div className="header__bar glass">
        <a href="#journey" aria-label="Ora home" className="header__logo" onClick={close}>
          <Logo />
        </a>
        <nav aria-label="Primary" id="primary-nav">
          <a href="#services" onClick={close}>
            Services
          </a>
          <a href="#journey" onClick={close}>
            How it works
          </a>
          <a href="#features" onClick={close}>
            The app
          </a>
        </nav>
        {menu && (
          <button
            type="button"
            className="header__menu"
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <i />
            <i />
          </button>
        )}
        <a className="btn btn--sm" href="#download" data-magnetic onClick={close}>
          Get the app
        </a>
      </div>
    </header>
  );
}
