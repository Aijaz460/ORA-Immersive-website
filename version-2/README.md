# Ora — Variant 2

The community story, as one continuous scroll: an everyday community of apartment blocks → in through an
open 8th-floor window to him at the leaking basin → he lifts his phone and the Ora splash appears on his
screen → the scroll zooms through the splash star into the app → the booking, step by step, under one
section title → your technician's photo opens out of the confirmation → he drives over in the Ora van →
live updates on the lock screen → the app, its screens and the Ora Academy → download.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Stack: Next.js 16 (App Router) · React 19 · GSAP + ScrollTrigger · Lenis · three.js.

---

## Repository map

| Path | What it is |
| --- | --- |
| `src/v2/SiteV2.tsx` | Page shell: Lenis smooth scroll, preloader, header theming, section order |
| `src/v2/JourneyV2.tsx` | **The story.** One pinned section driven by one paused GSAP timeline (see below) |
| `src/v2/ArrivalV2.tsx` | Lock-screen live updates (iOS-style notification stack) |
| `src/v2/FeaturesV2.tsx` | The app, feature by feature |
| `src/v2/Academy.tsx` | The Ora Academy: five training stages, each a looping film, then the certification seal |
| `src/v2/dust.ts` | The van's dust trail on the street scene |
| `src/v2/v2.css` | Variant 2 styles (on top of `src/app/globals.css`) |
| `src/components/scenes/Showcase.tsx`, `Download.tsx` | Shared sections (screens are passed in as props) |
| `src/components/ui/Phone.tsx` | The 3D device: edge plates + a `pop` layer for cards that lift off the glass |
| `src/lib/splashStar.ts`, `src/lib/oraWordmark.ts` | The splash star and the "Ora" lettering as vector outlines, drawn per frame so the zoom stays sharp at any scale |
| `src/lib/sequence.ts` | Scroll-scrubbed image sequences on canvas |
| `src/lib/journey.ts` | Shared story constants: the phone screen's corners in the film, tap targets |
| `public/v2/seq/*` | Frame sequences: the film (`story`, `story-m` for phones), the technician (`tech`), the street scene (`hello`, `accept`, `getin`, `drive`) |
| `public/v2/academy/*` | Academy films (`1–5.mp4`) and their posters (each film's first frame) |
| `public/v2/app/*`, `public/app/*` | App screens (2× Figma exports) and their card crops |
| `public/v2/img/*`, `public/img/*` | Stills: technician photo and card, posters, service tools |
| `source/footage/v2/*` | Source masters the frames were made from |
| `scripts/*.py` | Asset rebuilds (see *Assets*) and `artifact_v2.py`, a one-folder static bundle of the site |
| `tools/audit/*` | Real-browser checks: performance, accessibility, pacing, frame captures |

---

## How the story works (`JourneyV2.tsx`)

**One timeline, paused, scrubbed by scroll through a pace map.** Every beat is a tween at a named label;
a ScrollTrigger pins the section and maps scroll to timeline time through `PACE` (`[time, screens]`).
To make a stretch slower or faster, change its screens value. Lenis provides the smoothing; there is
deliberately no snapping.

**The booking steps** (`CHAPTERS`): 01 Services · 02 Plumbing · 03 Scheduling · 04 Review ·
05 Confirmed · 06 Your technician · 07 On the way. One glass card resizes to each step while its text
swaps (`chapter()`); the section title "Your Service in a Few Steps" holds its place above it.

**The splash zoom** (`wake` → `zoom` → `open`): the film stops with him holding the phone; the Ora splash
is projected onto his screen in the film's own perspective (`FILM_QUAD`, a homography). One scroll value
drives a constant-speed zoom: the camera closes in at his angle until his screen fills the view, then
continues inside the splash through the star's centre, which opens onto Step 01.

**Into his photo** (`techZoom`): after the booking is confirmed, the order details show the assigned
technician's thumbnail, an exact crop of the Step 06 photo (`AVATAR`, `AVATAR_SRC`). Only the photo
moves: its window opens from the thumbnail to the full screen while it scales up to its native size,
so it never stretches.

### Things that will bite you

- **GSAP folds CSS `translate` into its transform.** On anything GSAP animates, put offsets in
  `gsap.set`, never in CSS `translate`.
- **Function-based tween values are computed once** (e.g. tile positions in Step 01): reload after
  changing the window size when checking layouts.
- Screens are stacked in `SCREENS` order: a later screen in the list paints over an earlier one, so
  retire screens once they are covered (see the review screen in `done`).

---

### Phones and tablets

Nothing is hidden on small screens; everything is re-placed. `isMobile()` (`src/lib/stage.ts`) is true below
860px wide, or when `html.compact` is set (portrait touch screens up to 1200px wide). Desktop layout never
depends on phone rules.

---

## Assets

| Script | Rebuilds |
| --- | --- |
| `scripts/v2_date_screens.py` | The Plumbing date screen (hand refitted above the glass card) from 2× Figma exports |
| `scripts/v2_confirm_screens.py` | The confirmation screen, with the technician thumbnail cut from the Step 06 photo |
| `scripts/v2_academy_videos.py` | Academy films for all five steps from the supplied clips (`../Ora_videos/step{n}.mp4`); video streams are copied untouched, or a 2K master is used where one exists |
| `scripts/v2_compact_css.py` | `src/v2/compact.css`: every phone rule mirrored under `html.compact`, so portrait tablets get the phone layout. Re-run after editing phone CSS in `v2.css` |
| `scripts/artifact_v2.py` | A one-folder static bundle of the whole page (`artifact-v2/`) |

```bash
pip install opencv-python pillow numpy     # plus ffmpeg on PATH (or FFMPEG=/path/to/ffmpeg)
```

---

## Testing (`tools/audit`)

```bash
cd tools/audit && npm install
npm run build && npm start                 # in the project root, serves :3000
node run.mjs desktop 1440 900 1 30         # frame pacing + accessibility at 30 scroll stops
node pace.mjs 1280 800 80                  # visual change per scroll step
```

The page exposes `window.__oraJourney` (the timeline) and `window.__oraSeekY(time)` for these scripts.
