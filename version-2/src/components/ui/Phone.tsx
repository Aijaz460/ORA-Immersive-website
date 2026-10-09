import type { ReactNode } from "react";

// Device shell around a 412×910 app canvas (the size the ORA screens are designed at).
// The canvas is scaled by the --s custom property so the UI stays pixel-true to Figma.
// `pop` renders a second 412×910 layer in the phone's own 3D space, above the glass but not clipped
// by it, so UI cards can lift off the screen toward the viewer and settle back into place.
export default function Phone({
  children,
  className,
  glassClassName,
  pop,
}: {
  children: ReactNode;
  className?: string;
  glassClassName?: string;
  pop?: ReactNode;
}) {
  return (
    <div className={`phone ${className ?? ""}`}>
      {/* aluminium edge: stacked plates behind the face give the device real thickness when it turns */}
      <span className="phone__depth" aria-hidden>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <i key={i} style={{ transform: `translateZ(calc(${-i * 1.6}px * var(--s)))` }} />
        ))}
      </span>
      <div className={`phone__glass ${glassClassName ?? ""}`}>
        <div className="phone__island" />
        <div className="phone__screen">{children}</div>
        <div className="phone__sheen" />
      </div>
      {pop && <div className="phone__pop">{pop}</div>}
    </div>
  );
}
