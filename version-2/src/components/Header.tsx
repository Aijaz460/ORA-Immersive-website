import Logo from "./ui/Logo";

// visionOS-style floating glass capsule.
export default function Header() {
  return (
    <header className="header">
      <a className="skip" href="#services">
        Skip the story
      </a>
      <div className="header__bar glass">
        <a href="#journey" aria-label="Ora home" className="header__logo">
          <Logo />
        </a>
        <nav aria-label="Primary">
          <a href="#services">Services</a>
          <a href="#journey">How it works</a>
          <a href="#features">The app</a>
        </nav>
        <a className="btn btn--sm" href="#download" data-magnetic>
          Get the app
        </a>
      </div>
    </header>
  );
}
