# Ora — immersive marketing site

Two design variants of the same scroll-driven story, each a complete, self-contained Next.js project.
Pick one folder, run it, deploy it; the two never depend on each other.

| Folder | Variant | The story |
| --- | --- | --- |
| [`version-1/`](version-1) | **Variant 1** | The 3D Ora star → falling through clouds into a Dubai villa → a leak under the basin → he opens Ora on his phone → the booking flow in the real app UI → the technician accepts and rides over on his scooter |
| [`version-2/`](version-2) | **Variant 2** | An everyday apartment community → in through an 8th-floor window to the same leak → the Ora splash zooms into the app → the booking steps under one title, "Your Service in a Few Steps" → your technician's photo opens out of the confirmation → he drives over in the Ora van → the Ora Academy |

```bash
cd version-1        # or: cd version-2
npm install
npm run dev         # http://localhost:3000
npm run build && npm start
```

Stack (both): Next.js 16 (App Router) · React 19 · GSAP + ScrollTrigger · Lenis · three.js. No CMS, no
server code.

**Deploying both:** create one hosting project per folder and set its root directory to `version-1` or
`version-2` (on Vercel: *Project → Settings → Root Directory*).

Each folder has its own README with the details: how the story timeline works, the assets and how they
are rebuilt, and the testing tools.
