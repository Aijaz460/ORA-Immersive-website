// Story film: three Higgsfield/Seedance clips chained end-frame → start-frame, exported as one
// continuous frame sequence (public/seq/story). Segment boundaries are frame indices.
export const STORY = {
  path: "/seq/story",
  mobilePath: "/seq/story-m",
  frames: 318,
  aerialEnd: 120, // last frame of the drone flight (villa terrace)
  leakEnd: 257, // last frame of the walk-in (doors → living area → corner → basin)
};

// The phone's glass in the final film frame, as fractions of the 16:9 frame.
export const FILM_SCREEN = { x: 0.5475, y: 0.2023, w: 0.1705, h: 0.6176 };

// Tap targets in the 412×910 Figma screens.
export const TAPS = {
  plumbing: { left: 206, top: 510 }, // Plumbing card after the list settles at y -300
  fixture: { left: 276, top: 525 },
  day: { left: 278, top: 549 },
  slot: { left: 293, top: 680 },
  select: { left: 290, top: 814 },
  confirm: { left: 292, top: 816 }, // Confirm on "Plumbing – Order Review"
};

// Crop geometry of the technician photo: the in-phone photo (1062px wide) and the card/cut-out
// (2300px wide) come from the same 2350px-tall slice of one still, so they line up exactly.
export const TECH_RATIO = 2300 / 1062;
