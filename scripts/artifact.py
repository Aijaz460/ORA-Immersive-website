"""Package the site as a Claude artifact (a private claude.ai page with supporting files).

Artifacts serve files relative to the page and cap a version at 255 files / 64 MB, so this:
  1. bundles <Site /> with esbuild (scripts/artifact-entry.tsx) — no Next runtime, so nothing
     depends on root-absolute "/_next/" paths — plus globals.css, with the fonts next/font would add;
  2. copies public/ assets and rewrites root-absolute asset URLs ("/app/", "/img/", ...) to relative;
  3. packs each frame sequence into a few bundles in the loader's priority order (bundle 0 = the
     first pass the preloader waits for), with an index.json of byte ranges (see lib/sequence.ts);
  4. writes index.html as a body fragment (the artifact host supplies <html>/<head>/<body>).

Usage (from ora-web/):  python3 scripts/artifact.py
Output: artifact/ — publish artifact/index.html with every other file as a supporting file.
"""

import json
import os
import re
import shutil
import subprocess

OUT = "artifact"
ASSET_DIRS = ("app", "img", "seq", "video")
SEQS = {"seq/story": 8, "seq/story-m": 16}  # sequence path → first-pass stride (see Journey.tsx)
BUNDLE_FRAMES = 64

FONT_FACES = "\n".join(
    f'@font-face{{font-family:"Melodrama";src:url(./fonts/Melodrama-{name}.woff2) format("woff2");'
    f"font-weight:{weight};font-style:normal;font-display:swap}}"
    for name, weight in (("Light", 300), ("Regular", 400), ("Medium", 500), ("Semibold", 600), ("Bold", 700))
)
FONT_VARS = ':root{--font-display:"Melodrama";--font-body:"Inter"}'


def rewrite_assets(text: str) -> str:
    # asset strings resolve against the page, which sits at the artifact root
    for d in ASSET_DIRS:
        text = re.sub(r'(["\'`(=\s])/' + d + "/", lambda m: m.group(1) + "./" + d + "/", text)
    return text


def order(count: int, stride: int) -> list[int]:
    seen, out = {0}, [0]
    for step in (stride, 8, 4, 2, 1):
        for i in range(0, count, step):
            if i not in seen:
                seen.add(i)
                out.append(i)
    return out


def bundle(seq: str, stride: int) -> None:
    src_dir = os.path.join("public", seq)
    frames = sorted(f for f in os.listdir(src_dir) if f.endswith(".webp"))
    count = len(frames)
    pri = order(count, stride)
    first = len(range(0, count, stride))  # frame 0 + the stride pass
    groups = [pri[:first]] + [pri[k : k + BUNDLE_FRAMES] for k in range(first, count, BUNDLE_FRAMES)]
    out_dir = os.path.join(OUT, seq)
    os.makedirs(out_dir, exist_ok=True)
    index = {"bundles": []}
    for n, group in enumerate(groups):
        name = f"frames-{n}.webp"  # concatenated webp frames (a file type artifacts serve)
        entries, off = [], 0
        with open(os.path.join(out_dir, name), "wb") as fh:
            for i in group:
                data = open(os.path.join(src_dir, frames[i]), "rb").read()
                fh.write(data)
                entries.append([i, off, len(data)])
                off += len(data)
        index["bundles"].append({"file": name, "frames": entries})
    json.dump(index, open(os.path.join(out_dir, "index.json"), "w"), separators=(",", ":"))
    print(f"{seq}: {count} frames → {len(groups)} bundles (first {len(groups[0])})")


def main() -> None:
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)

    # 1 · JS + CSS
    subprocess.run(
        [
            "npx", "-y", "esbuild@0.24.2", "scripts/artifact-entry.tsx", "src/app/globals.css",
            "--bundle", "--minify", "--jsx=automatic", "--target=es2020", "--legal-comments=none",
            f"--outdir={OUT}", "--entry-names=[name]", "--external:/img/*", "--external:/app/*",
            '--define:process.env.NODE_ENV="production"', '--define:process.env.NEXT_PUBLIC_SEQ_BUNDLE="1"',
            "--log-level=warning",
        ],
        check=True,
    )
    js = os.path.join(OUT, "artifact-entry.js")
    open(os.path.join(OUT, "ora.js"), "w").write(rewrite_assets(open(js).read()))
    os.remove(js)
    css = os.path.join(OUT, "globals.css")
    open(os.path.join(OUT, "ora.css"), "w").write(FONT_FACES + FONT_VARS + rewrite_assets(open(css).read()))
    os.remove(css)
    shutil.copytree("src/fonts", os.path.join(OUT, "fonts"))

    # 2 · public assets (frame sequences are bundled separately)
    for d in ("app", "img", "video"):
        if os.path.isdir(os.path.join("public", d)):
            shutil.copytree(os.path.join("public", d), os.path.join(OUT, d))
    for seq, stride in SEQS.items():
        bundle(seq, stride)

    # 3 · page fragment
    page = (
        "<title>Ora Home Maintenance</title>"
        '<meta name="description" content="Dubai in-house home maintenance, booked in three taps.">'
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap">'
        '<link rel="stylesheet" href="./ora.css">'
        '<script>document.documentElement.lang="en"</script>'
        '<div id="ora-root"></div>'
        '<script src="./ora.js" defer></script>'
    )
    open(os.path.join(OUT, "index.html"), "w").write(page)

    files = [os.path.join(d, f) for d, _, fs in os.walk(OUT) for f in fs if f != ".DS_Store"]
    size = sum(os.path.getsize(f) for f in files)
    print(f"{len(files)} files, {size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
