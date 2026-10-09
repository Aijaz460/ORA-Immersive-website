// Story film: four clips chained end-frame → start-frame, exported as one
// continuous frame sequence (public/seq/story). Segment boundaries are frame indices.
export const STORY = {
  path: "/seq/story",
  mobilePath: "/seq/story-m",
  frames: 318,
  aerialEnd: 120, // last frame of the drone flight (villa terrace)
  leakEnd: 257, // last frame of the walk-in (doors → living area → corner → basin)
  liftEnd: 297, // he has the phone in hand, looking at it (0-based index of frame 298)
};

// The film stops at frame 298: he looks down at the phone in his hand over his own shoulder (the
// later frames raise it towards the camera, which reads as showing it rather than using it).
// Its screen, corners as fractions of the 16:9 frame: top-left, top-right, bottom-right, bottom-left.
export const FILM_QUAD: [number, number][] = [
  // straight lines fitted to the black glass on all four sides, intersected (phone tipped back a
  // little: the bottom edge is wider than the top)
  [0.47974, 0.36296],
  [0.57792, 0.35296],
  [0.57682, 0.71213],
  [0.46427, 0.71546],
];
// …and the same screen as an upright box (centre, mean width, height along the phone's long axis)
export const FILM_SCREEN = { x: 0.47204, y: 0.35783, w: 0.1053, h: 0.3561 };

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
