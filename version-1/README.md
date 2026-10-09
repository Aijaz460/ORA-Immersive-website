# Ora — Variant 1

One continuous, scroll-driven story: the 3D Ora star → falling through clouds into a Dubai villa →
a leak under the basin → he opens Ora on his phone → the booking flow in the real app UI → his
technician accepts the job and rides over. Everything the site needs is in this repository: code,
every frame and image it displays, the source footage, and the tools used to build and test it.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Stack: Next.js 16 (App Router) · React 19 · GSAP + ScrollTrigger · Lenis · three.js. No other runtime
dependencies; no CMS; no server code.

---

## Repository map

| Path | What it is |
| --- | --- |
| `src/components/Site.tsx` | Page shell: Lenis smooth scroll, preloader, header theming, cursor |
| `src/components/scenes/Journey.tsx` | **The story.** One pinned section driven by one GSAP timeline (see below) |
| `src/components/scenes/Arrival.tsx`, `Showcase.tsx`, `Features.tsx`, `Download.tsx` | The sections after the story |
| `src/components/ui/Phone.tsx` | The 3D device: edge thickness plates + a `pop` layer where UI cards lift off the glass |
| `src/lib/logo3d.ts` | The 3D Ora star (three.js), built from the logo's SVG outline — no model file |
| `src/lib/sequence.ts` | Scroll-scrubbed image sequences on canvas (film + character clips) |
| `src/lib/journey.ts` | Story constants: frame counts, the phone screen's corners in the film, tap targets |
| `src/lib/stage.ts` | Phone scale, breakpoints, reduced-motion |
| `src/app/globals.css` | All styles (rounds of work are grouped in commented blocks) |
| `public/seq/*` | Frame sequences (see *Assets*) |
| `public/app/*` | Figma exports of the Ora app screens and card crops, 2× |
| `public/img/*` | Stills: sky, technician card, parked scooter, service tools… |
| `source/footage/*` | Source masters the frames were made from |
| `scripts/rebuild_story.py` | Rebuilds the story film frames from the 4K masters |
| `tools/key.py` | Green-screen keying → transparent WebP frames |
| `tools/audit/*` | Real-browser checks: performance, accessibility, pacing, frame-by-frame captures |

---

## How the story works (`Journey.tsx`)

**One timeline, paused.** Every scene is a tween on a single GSAP timeline at a named label:

`logo` → `hero` → `sky` → `fly` → `leak` → `water` → `lift` → `wake` → `pop` → `portal` → `dive` →
`app` → `plumb` → `openPlumb` → `date` → `tech` → `review` → `done` → `accept` → `ride` → `away`

**Scroll drives it 1:1 through a pace map.** A ScrollTrigger pins the section and converts scroll
position to timeline time via `PACE` — a list of `[timeline time, screens of scroll]`. To make a
stretch feel slower or faster, change its screens value; nothing else needs to move. The values were
balanced by measurement (`tools/audit/pace.mjs`: visual change per equal scroll step), so the film
never rushes and the app beats never drag.

**Smoothing comes from Lenis only** (`Site.tsx`, `lerp: 0.1`; native scrolling on touch). Every
ScrollTrigger scrubs 1:1 (`scrub: true`). There is deliberately **no snapping or step-scrolling**: it
was tried and rejected in user testing — it fights trackpad momentum.

**Chapters.** One persistent glass card (`.jr__chapterbg`) resizes to each chapter while the text
swaps (`chapter()` in `Journey.tsx`); the dots and the page tint follow.

### The phone moment (`wake` → `pop` → `portal` → `dive`)

- The film stops on frame 298 (`STORY.liftEnd`): he holds the phone, looking at it over his shoulder.
- The app's launch screens are projected onto his screen with a CSS `matrix3d` homography
  (`quadMatrix`) from the four corners in `FILM_QUAD` — straight lines fitted to the black glass on all
  four sides. If the film is ever re-cut, re-measure these corners.
- His thumb taps the Ora icon; the app opens iOS-style from the icon (scale + rounded crop).
- The 3D star (`logo3d.ts` with `setStage(false)`) rises out of his screen; scrolling flies through
  its opening while the camera dives into the phone behind it. During the dive the projected screen
  straightens into an upright box that lands exactly on the app phone's glass, so the hand-off is one
  picture.

### Things that will bite you

- **GSAP folds CSS `translate` into its transform.** On anything GSAP animates, put offsets
  (`xPercent`, `z`, …) in `gsap.set`, never in CSS `translate`.
- **Never hide a live WebGL canvas with `visibility`** — fade it with `opacity` (compositor stall).
- **Headless Chrome renders WebGL in software.** Stalls you see around the 3D star in headless runs
  do not happen on real GPUs; verify performance with `tools/audit/gpurun.mjs` (visible Chrome).
- The film's own phone screen sits exactly behind the app phone after the dive; it must stay hidden
  once the dive ends, or it shows through when the device turns.

---

## Assets

### Frame sequences (`public/seq`)

| Folder | Frames | Size | Made from |
| --- | --- | --- | --- |
| `story/` | 318 | 1920×1080 | `source/footage/film/*` via `scripts/rebuild_story.py` |
| `story-m/` | 318 | 1600×900 | same (phones) |
| `tech/` | 61 | 1100×1125 | `source/footage/technician/technician-smile-fold-arms.mp4`, every 2nd frame |
| `accept/` | 61 | 540×960 (alpha) | `characters/technician-accepts-job-greenscreen.mp4`, keyed, every 2nd frame |
| `yard/` | 77 | 960×960 (alpha) | `characters/helmet-ride-off-greenscreen.mp4`, frames 1–230 keyed, every 3rd |

`sequence.ts` fetches frames as compressed blobs in priority order (first frame, then every Nth, then
the gaps) and decodes a rolling window around the playhead into `ImageBitmap`s off the main thread.
Holding all frames decoded is not an option (~2.6 GB for the story), and letting `<img>` decode inside
`drawImage` stalls scrolling.

### Story film

`scripts/rebuild_story.py` splices the four 4K masters into one 318-frame film:
aerial 1–121 · leak 2–60 · walk-in 2–60 · leak 79–97 · lift 2–61 (every 2nd source frame), repairs
the door gap on frames 139–171, synthesises the doors opening (172–191) and writes the blurred frame
used for the dive's focus pull (`public/img/story-soft.webp`).

```bash
pip install opencv-python pillow numpy     # plus ffmpeg on PATH (or FFMPEG=/path/to/ffmpeg)
python scripts/rebuild_story.py            # QD/QM env vars set WebP quality (desktop/mobile)
```

### Keyed character clips

```bash
ffmpeg -i source/footage/characters/technician-accepts-job-greenscreen.mp4 -pix_fmt rgb24 /tmp/accept/%03d.png
python tools/key.py /tmp/accept public/seq/accept 540 960 2 islands

ffmpeg -i source/footage/characters/helmet-ride-off-greenscreen.mp4 -frames:v 230 -pix_fmt rgb24 /tmp/yard/%03d.png
python tools/key.py /tmp/yard public/seq/yard 960 960 3
```

The ride-off clip starts on `characters/ride-off-start-composite.png` — the parked scooter and the
technician laid out exactly as on the page (`YARD` in `Journey.tsx`), so the page's still layers hand
over to the clip seamlessly. If you move either layer, the composite and the clip must match.

### App UI

All app screens are 2× exports from the Ora Figma file (412×910 design size). Cards that animate on
their own (Plumbing card, date card, confirmation card, review cards) are crops of those exports with
rounded masks, placed at their exact Figma coordinates (`POP`, `RV_CARDS` in `Journey.tsx`).

---

## Testing (`tools/audit`)

```bash
cd tools/audit && npm install
npm run build && npm start                 # in the project root, serves :3000
node run.mjs desktop 1440 900 1 30         # frame pacing + axe (WCAG 2.2 AA) at 30 scroll stops
node run.mjs mobile 390 844 2 30
node pace.mjs 1280 800 80                  # visual change per scroll step (writes pace-1280.json)
node frames.mjs 1440 900 d                 # frame-by-frame captures of the phone moment
node beats.mjs 1440 900 d http://localhost:3000 "tech+1.4,review+2"   # captures at story labels
node gpurun.mjs                            # continuous scroll in a visible (real-GPU) Chrome
```

Set `CHROME=/path/to/chrome` if Chrome is not in `/Applications`, and `URL=` to test another host.
The page exposes `window.__oraJourney` (timeline) and `window.__oraSeekY(time)` for these scripts.

Last verified: 0 axe violations (desktop + mobile), no console errors, no horizontal overflow;
real-GPU continuous scroll p99 frame 10.4 ms at 120 Hz.

---

## Deploy

Any static-capable Next.js host (Vercel: import the repo; `source/` and `tools/` are excluded by
`.vercelignore`). `scripts/artifact.py` builds an alternative standalone static bundle (no Next
runtime) into `artifact/` for hosts with file-count limits.
