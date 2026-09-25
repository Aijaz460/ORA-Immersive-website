"""Rebuild public/seq/story{,-m} from the 4K-upscaled clips (supersampled to 1920×1080).

Frame map (every 2nd source frame, splices chosen so every seam is continuous motion):
  aerial 1..121 · leak 2..60 · walk-in 2..60 · leak 79..97 · lift 2..61   = 318 frames
Then: door-gap repair on 139..171 (the man must not show through the closed doors),
doors-opening transition 172..191, blurred end frame for the dive focus pull.
"""
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

S = os.path.dirname(os.path.abspath(__file__))
G = "/Users/mohammad.aijaz/Desktop/AGI-Projects/ORA /assets-raw/gen/4k"
WEB = "/Users/mohammad.aijaz/Desktop/AGI-Projects/ORA /ora-web"
FF = f"{S}/venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
OUT = f"{S}/hq4"
QD, QM = int(os.environ.get("QD", 80)), int(os.environ.get("QM", 70))
CLIPS = {"a": "aerial-fly10", "l": "leak", "w": "walkin", "t": "lift"}


def extract():
    for k, name in CLIPS.items():
        d = f"{OUT}/{k}"
        os.makedirs(d, exist_ok=True)
        subprocess.run(
            [FF, "-loglevel", "error", "-y", "-i", f"{G}/{name}.mp4", "-vf",
             "select=not(mod(n\\,2)),scale=1920:1080:flags=lanczos,unsharp=5:5:0.35:5:5:0",
             "-vsync", "vfr", "-pix_fmt", "rgb24", f"{d}/%03d.png"],
            check=True,
        )
        print(k, len(os.listdir(d)), "frames")


SRC = (
    [f"a/{i:03d}" for i in range(1, 122)]
    + [f"l/{i:03d}" for i in range(2, 61)]
    + [f"w/{i:03d}" for i in range(2, 61)]
    + [f"l/{i:03d}" for i in range(79, 98)]
    + [f"t/{i:03d}" for i in range(2, 62)]
)
KEYS = [(139, 1162), (140, 1159), (143, 1150), (146, 1140), (152, 1128), (158, 1088), (164, 1048), (171, 1048)]


def pred(n):
    return float(np.interp(n, [k for k, _ in KEYS], [v for _, v in KEYS]))


def close_gap(img, n):
    H, W = img.shape[:2]
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(float)
    gx = np.abs(cv2.Sobel(g, cv2.CV_64F, 1, 0, ksize=3))
    prof = gx[int(H * 0.2) : int(H * 0.8)].mean(0)
    c = int(pred(n))
    lo, hi = c - 90, c + 90
    p = prof[lo:hi]
    idx = np.argsort(p)[::-1]
    a = idx[0]
    b = next(i for i in idx[1:] if abs(i - a) >= 5)
    x0, x1 = sorted((lo + a, lo + b))
    if x1 - x0 > 70:
        x0, x1 = c - 10, c + 10
    m = np.zeros((H, W), np.uint8)
    m[int(H * 0.02) : int(H * 0.97), x0 - 3 : x1 + 4] = 255
    return cv2.inpaint(img, m, 12, cv2.INPAINT_TELEA)


def frame(n):  # 1-based story index → PIL image
    img = cv2.imread(f"{OUT}/{SRC[n - 1]}.png")
    if 139 <= n <= 171:
        img = close_gap(img, n)
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))


def save(n, im):
    im.save(f"{WEB}/public/seq/story/{n:03d}.webp", quality=QD, method=6)
    im.resize((1600, 900), Image.LANCZOS).save(f"{WEB}/public/seq/story-m/{n:03d}.webp", quality=QM, method=6)


def job(n):
    if 172 <= n <= 191:
        return n
    save(n, frame(n))
    return n


def doors():
    door, room = frame(171), frame(192)
    W, H = door.size
    SEAM = 1044

    def scaled(im, s):
        w, h = int(W * s), int(H * s)
        r = im.resize((w, h), Image.LANCZOS)
        return r.crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))

    N = 20
    for k in range(N):
        t = (k + 1) / (N + 1)
        e = t * t * (3 - 2 * t)
        bg = scaled(room, 1.14 - 0.14 * e)
        d = scaled(door, 1 + 0.18 * e)
        seam = int(W / 2 + (SEAM - W / 2) * (1 + 0.18 * e))
        left, right = d.crop((0, 0, seam, H)), d.crop((seam, 0, W, H))
        shade = 1 - 0.3 * e
        left = ImageEnhance.Brightness(left).enhance(shade)
        right = ImageEnhance.Brightness(right).enhance(shade)
        o = e ** 1.15
        out = bg.copy()
        out.paste(left, (int(-seam * o), 0))
        out.paste(right, (int(seam + (W - seam) * o), 0))
        save(172 + k, out)


if __name__ == "__main__":
    if not os.environ.get("SKIP_EXTRACT"):
        extract()
    assert len(SRC) == 318
    with ProcessPoolExecutor(8) as ex:
        list(ex.map(job, range(1, 319)))
    doors()
    end = frame(318).resize((960, 540), Image.LANCZOS).filter(ImageFilter.GaussianBlur(14))
    end.save(f"{WEB}/public/img/story-soft.webp", quality=80)
    print("done")
