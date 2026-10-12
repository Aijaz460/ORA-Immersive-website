"""Package Variant 2 (/v2) as a Claude artifact. Same approach as scripts/artifact.py (which builds
Variant 1 and is left as it is), plus: the /v2/ asset tree, the CSS SiteV2 imports, and a lighter
re-encode of the frame sequences and Academy films so the whole page fits an artifact version
(255 files / 64 MB). The repo's full-quality assets are not touched.

Usage (from ora-web/):  python3 scripts/artifact_v2.py      (needs Pillow, and ffmpeg via FFMPEG or PATH)
Output: artifact-v2/ — publish artifact-v2/index.html with every other file as a supporting file.
"""

import io
import json
import os
import re
import shutil
import subprocess
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from artifact import FONT_FACES, FONT_VARS, order  # noqa: E402

OUT = "artifact-v2"
ASSET_DIRS = ("app", "img", "seq", "video", "v2")
BUNDLE_FRAMES = 64
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
# sequence → (first-pass stride, artifact width, webp quality)
SEQS = {
    "v2/seq/story": (8, 1920, 62),
    "v2/seq/story-m": (16, 1280, 50),
    "v2/seq/hello": (4, 1920, 70),
    "v2/seq/accept": (4, 1920, 70),
    "v2/seq/getin": (4, 1920, 70),
    "v2/seq/drive": (4, 1920, 70),
    "v2/seq/tech": (4, 1100, 72),
}


def rewrite_assets(text: str) -> str:
    for d in ASSET_DIRS:
        text = re.sub(r'(["\'`(=\s])/' + d + "/", lambda m: m.group(1) + "./" + d + "/", text)
    return text


def encode(path: str, width: int, quality: int) -> bytes:
    im = Image.open(path)
    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")  # the cut-out clips keep their transparency
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, method=6, alpha_quality=90)
    return buf.getvalue()


def bundle(seq: str, stride: int, width: int, quality: int) -> None:
    src_dir = os.path.join("public", seq)
    frames = sorted(f for f in os.listdir(src_dir) if f.endswith(".webp"))
    count = len(frames)
    pri = order(count, stride)
    first = len(range(0, count, stride))
    groups = [pri[:first]] + [pri[k : k + BUNDLE_FRAMES] for k in range(first, count, BUNDLE_FRAMES)]
    out_dir = os.path.join(OUT, seq)
    os.makedirs(out_dir, exist_ok=True)
    index = {"bundles": []}
    for n, group in enumerate(groups):
        name = f"frames-{n}.webp"
        entries, off = [], 0
        with open(os.path.join(out_dir, name), "wb") as fh:
            for i in group:
                data = encode(os.path.join(src_dir, frames[i]), width, quality)
                fh.write(data)
                entries.append([i, off, len(data)])
                off += len(data)
        index["bundles"].append({"file": name, "frames": entries})
    json.dump(index, open(os.path.join(out_dir, "index.json"), "w"), separators=(",", ":"))
    print(f"{seq}: {count} frames → {len(groups)} bundles")


def main() -> None:
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)

    # 1 · JS + CSS (SiteV2 imports src/v2/v2.css, which esbuild emits next to the entry)
    subprocess.run(
        [
            "npx", "-y", "esbuild@0.24.2", "scripts/artifact-entry-v2.tsx", "src/app/globals.css",
            "--bundle", "--minify", "--jsx=automatic", "--target=es2020", "--legal-comments=none",
            f"--outdir={OUT}", "--entry-names=[name]", "--external:/img/*", "--external:/app/*", "--external:/v2/*",
            '--define:process.env.NODE_ENV="production"', '--define:process.env.NEXT_PUBLIC_SEQ_BUNDLE="1"',
            "--log-level=warning",
        ],
        check=True,
    )
    js = os.path.join(OUT, "artifact-entry-v2.js")
    open(os.path.join(OUT, "ora.js"), "w").write(rewrite_assets(open(js).read()))
    os.remove(js)
    css = open(os.path.join(OUT, "globals.css")).read()
    os.remove(os.path.join(OUT, "globals.css"))
    v2css = os.path.join(OUT, "artifact-entry-v2.css")
    if os.path.exists(v2css):
        css += "\n" + open(v2css).read()
        os.remove(v2css)
    open(os.path.join(OUT, "ora.css"), "w").write(FONT_FACES + FONT_VARS + rewrite_assets(css))
    shutil.copytree("src/fonts", os.path.join(OUT, "fonts"))

    # 2 · public assets: shared app/img, the v2 stills, lighter Academy films, bundled sequences
    for d in ("app", "img"):
        # Variant 1-only stills (its avatar card, its scooter) are not used by Variant 2
        shutil.copytree(os.path.join("public", d), os.path.join(OUT, d),
                        ignore=shutil.ignore_patterns("technician-avatar.webp", "parked-scooter.webp"))
    shutil.copytree("public/v2/img", os.path.join(OUT, "v2/img"))
    shutil.copytree("public/v2/app", os.path.join(OUT, "v2/app"))  # V2-only screen exports
    os.makedirs(os.path.join(OUT, "v2/academy"))
    for f in sorted(os.listdir("public/v2/academy")):
        src, dst = os.path.join("public/v2/academy", f), os.path.join(OUT, "v2/academy", f)
        if f in ("1.mp4", "2.mp4", "3.mp4", "4.mp4", "5.mp4"):
            # the supplied Academy films (scripts/v2_academy_videos.py): shipped exactly as supplied
            shutil.copy(src, dst)
        elif f.endswith(".mp4"):
            subprocess.run(
                [FFMPEG, "-v", "error", "-y", "-i", src, "-an", "-map_metadata", "-1", "-vf", "scale=860:860",
                 "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst],
                check=True,
            )
        else:
            shutil.copy(src, dst)
    for seq, (stride, width, quality) in SEQS.items():
        bundle(seq, stride, width, quality)

    # 3 · page fragment
    page = (
        "<title>Ora Home Maintenance V2</title>"
        '<meta name="description" content="Variant 2: the community story, the Ora van and the Ora Academy.">'
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
