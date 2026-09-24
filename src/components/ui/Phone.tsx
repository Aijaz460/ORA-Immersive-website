import type { ReactNode } from "react";

// Device shell around a 412×910 app canvas (the size the ORA screens are designed at).
// The canvas is scaled by the --s custom property so the UI stays pixel-true to Figma.
export default function Phone({
  children,
  className,
  glassClassName,
}: {
  children: ReactNode;
  className?: string;
  glassClassName?: string;
}) {
  return (
    <div className={`phone ${className ?? ""}`}>
      <div className={`phone__glass ${glassClassName ?? ""}`}>
        <div className="phone__island" />
        <div className="phone__screen">{children}</div>
        <div className="phone__sheen" />
      </div>
    </div>
  );
}
