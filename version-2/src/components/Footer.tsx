import { Mark } from "./ui/Logo";

// Contact details and links as specified in the Figma website designs.
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <span className="logo footer__logo">
            <span className="logo__word">Ora</span>
            <Mark className="logo__mark" />
          </span>
          <p>Home maintenance, done properly. In-house teams for Dubai&apos;s apartments and villas.</p>
        </div>
        <div className="footer__col">
          <h3 className="footer__h">Follow us</h3>
          <a href="#">Instagram</a>
          <a href="#">LinkedIn</a>
          <a href="#">X / Twitter</a>
        </div>
        <div className="footer__col">
          <h3 className="footer__h">Ora support</h3>
          <a href="mailto:hello@ora.ae">hello@ora.ae</a>
          <a href="tel:+97141234567">+971 4 123 4567</a>
          <span>Dubai, UAE</span>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© 2026 Ora Home Technologies LLC. All rights reserved.</span>
        <span className="footer__links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms &amp; Conditions</a>
          <a href="#">Cookies Policy</a>
        </span>
      </div>
    </footer>
  );
}
