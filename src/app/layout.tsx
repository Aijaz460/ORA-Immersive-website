import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

// Melodrama (Indian Type Foundry, free commercial licence via fontshare.com) for all display type.
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../fonts/Melodrama-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/Melodrama-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Melodrama-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Melodrama-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Melodrama-Bold.woff2", weight: "700", style: "normal" },
  ],
});

// Body copy stays on a quiet grotesk; the app's own ABC Oracle can replace it once licensed.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ora — Home maintenance, done properly",
  description:
    "Book in-house plumbers, electricians, cleaners and AC technicians in Dubai. Exact two-hour slots, fixed prices and a written report after every visit.",
};

export const viewport: Viewport = {
  themeColor: "#FDF4E2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
