// The nine ORA service categories, mirrored from Figma "All services background" (2:11388).
// `screen` is the in-app background pastel, `stage` the page tint used while that service is in focus.
// Order ends on Plumbing so the reel lands on the service we zoom into.

export type Service = {
  id: string;
  name: string;
  line: string;
  screen: [string, string];
  stage: string;
  ink: string;
  tools: { src: string; w: number; x: number; y: number; r?: number }[];
};

export const SERVICES: Service[] = [
  {
    id: "cleaning",
    name: "Cleaning",
    line: "Professional cleaning for a fresh, healthy home.",
    screen: ["#BCD8E6", "#E4F0F4"],
    stage: "#D9E8EF",
    ink: "#1D567D",
    tools: [{ src: "/img/tools/cleaning.webp", w: 46, x: 44, y: 11, r: 4 }],
  },
  {
    id: "ac",
    name: "AC & Mechanical",
    line: "Hassle-free AC and mechanical upkeep for everyday comfort.",
    screen: ["#CBBDE2", "#E7E0F2"],
    stage: "#E2DAF0",
    ink: "#4B3A73",
    tools: [
      { src: "/img/tools/ac-hammer.webp", w: 58, x: 46, y: 14, r: -8 },
      { src: "/img/tools/ac-driver.webp", w: 26, x: 22, y: 18, r: 18 },
    ],
  },
  {
    id: "pest",
    name: "Pest Control",
    line: "Effective, family-safe pest control for your home.",
    screen: ["#D5DAF4", "#EEF0FA"],
    stage: "#E6E9F8",
    ink: "#3C4A86",
    tools: [{ src: "/img/tools/pest.webp", w: 78, x: 30, y: 6 }],
  },
  {
    id: "electrical",
    name: "Electrical",
    line: "Safe, certified and reliable electrical services.",
    screen: ["#FAD99B", "#FDEFD3"],
    stage: "#FCE8C2",
    ink: "#8A5A12",
    tools: [{ src: "/img/tools/electrical.webp", w: 40, x: 42, y: 10, r: -4 }],
  },
  {
    id: "handyman",
    name: "Handyman",
    line: "Carpentry, mounting and everyday household fixes.",
    screen: ["#F8D5A4", "#FCEBD4"],
    stage: "#FBE3C4",
    ink: "#7A4A18",
    tools: [{ src: "/img/tools/handyman.webp", w: 70, x: 34, y: 12, r: -6 }],
  },
  {
    id: "restoration",
    name: "Restoration",
    line: "Move-in, move-out and minor restoration works.",
    screen: ["#CDBEE3", "#EAE3F3"],
    stage: "#E4DCF0",
    ink: "#4B3A73",
    tools: [{ src: "/img/tools/restoration.webp", w: 72, x: 26, y: 14 }],
  },
  {
    id: "landscaping",
    name: "Landscaping",
    line: "Garden upkeep and outdoor care, season after season.",
    screen: ["#C6DBB9", "#E6EFDF"],
    stage: "#DDE9D3",
    ink: "#4D4721",
    tools: [{ src: "/img/tools/landscaping.webp", w: 70, x: 26, y: 16, r: -10 }],
  },
  {
    id: "watertank",
    name: "Water Tank Cleaning",
    line: "Deep cleaning and disinfection for safe, fresh water.",
    screen: ["#B9D6E4", "#E2EEF3"],
    stage: "#D5E6EE",
    ink: "#1D567D",
    tools: [{ src: "/img/tools/watertank.webp", w: 72, x: 30, y: 8 }],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    line: "Fast solutions for leaks, clogs and fixture installation.",
    screen: ["#C5D9C0", "#E5EEE1"],
    stage: "#DCE8D6",
    ink: "#2F4A2A",
    tools: [{ src: "/img/tools/plumbing.webp", w: 62, x: 36, y: 6, r: -4 }],
  },
];

export const PLUMBING_INDEX = SERVICES.findIndex((s) => s.id === "plumbing");
