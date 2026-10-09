"""Chroma-key a folder of green-screen frames into transparent WebP frames.

Used for every keyed character clip on the site (the technician accepting the job, the parked
scooter, the helmet + ride-off clip). Extract frames first, e.g.:

    ffmpeg -i source/footage/characters/helmet-ride-off-greenscreen.mp4 -pix_fmt rgb24 /tmp/yard/%03d.png

then:

    python tools/key.py /tmp/yard public/seq/yard 960 960 3              # every 3rd frame, 960×960
    python tools/key.py /tmp/accept public/seq/accept 540 960 2 islands  # + drop floating blobs

Arguments: src_dir dst_dir width height step [islands]
  step     keep every Nth source frame (2 = 12 fps from a 24 fps clip)
  islands  keep only the main body: removes detached blobs (stray UI elements in the plate)

Requires: numpy, pillow, opencv-python (islands mode only).
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image


def key(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.maximum(r, b)
    d = g - m  # how much greener than the other channels
    alpha = 1 - np.clip((d - 18) / 50, 0, 1)
    # spill suppression: pull green down towards the other channels on greenish pixels
    g2 = np.where(d > 0, m + np.clip(d, 0, None) * 0.15, g)
    return np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)


def drop_islands(out: np.ndarray) -> np.ndarray:
    import cv2

    solid = (out[..., 3] > 40).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(solid, 8)
    if n <= 2:
        return out
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    keep = np.zeros(n, bool)
    keep[big] = True
    body = (lab == big).astype(np.uint8)
    near = cv2.dilate(body, np.ones((25, 25), np.uint8)) > 0
    for i in range(1, n):  # tiny bits hugging the body (finger tips, edge pixels) stay
        if not keep[i] and st[i, cv2.CC_STAT_AREA] < 400 and near[lab == i].any():
            keep[i] = True
    gone = (~keep[lab]) & (solid > 0)
    gone = cv2.dilate(gone.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    out[..., 3] = np.where(gone & (lab != big), 0, out[..., 3])
    return out


def job(args):
    src, dst, size, islands = args
    out = key(np.asarray(Image.open(src).convert("RGB")))
    if islands:
        out = drop_islands(out)
    Image.fromarray(out, "RGBA").resize(size, Image.LANCZOS).save(dst, quality=80, method=6, alpha_quality=90)
    return dst


if __name__ == "__main__":
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    w, h, step = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    islands = len(sys.argv) > 6 and sys.argv[6] == "islands"
    os.makedirs(dst_dir, exist_ok=True)
    files = sorted(f for f in os.listdir(src_dir) if f.lower().endswith(".png"))[::step]
    jobs = [(f"{src_dir}/{f}", f"{dst_dir}/{i + 1:03d}.webp", (w, h), islands) for i, f in enumerate(files)]
    with ProcessPoolExecutor(8) as ex:
        list(ex.map(job, jobs))
    print(len(jobs), "frames →", dst_dir)
