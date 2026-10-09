"""Story film: give the top-floor balcony (solid parapet) the same railing bay as every floor below.
The facade is a plane and repeats one floor per P pixels in the reference frame, so in every frame the
bay is rebuilt from that frame's own pixels one floor down (via the frame's homography to the reference).
usage: balcony.py <story_dir> <out_dir> <first> <last>
"""
import os, sys
import numpy as np, cv2

SRC, OUT, A, B = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
R = 186                      # reference frame (both bays in view, square-on)
P = 467                      # one floor, in reference pixels
X0, X1 = 1224, 1598          # the balcony bay, just inside the pilasters (reference)
Y1 = 370                     # underside of the top bay's slab; the band above it is rebuilt
Y0 = Y1 - P
FEATHER = 3

orb = cv2.ORB_create(6000)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)


def load(i):
    return cv2.imread(os.path.join(SRC, f"{i:03d}.webp"), cv2.IMREAD_COLOR)


def homog(a, b):
    """H mapping image a -> image b (facade plane)."""
    ga, gb = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
    ka, da = orb.detectAndCompute(ga, None)
    kb, db = orb.detectAndCompute(gb, None)
    m = sorted(bf.match(da, db), key=lambda x: x.distance)[:1500]
    pa = np.float32([ka[x.queryIdx].pt for x in m])
    pb = np.float32([kb[x.trainIdx].pt for x in m])
    H, inl = cv2.findHomography(pa, pb, cv2.RANSAC, 2.0)
    return H, int(inl.sum())


ref = load(R)
H_, W_ = ref.shape[:2]
T = np.array([[1, 0, 0], [0, 1, P], [0, 0, 1]], float)
mask_r = np.zeros((H_ + 2 * P, W_), np.float32)  # reference mask can extend above the frame: offset by P
yy0 = max(Y0, -P)
mask_r[yy0 + P: Y1 + P, X0:X1] = 1
mask_r = cv2.GaussianBlur(mask_r, (0, 0), FEATHER)
OFF = np.array([[1, 0, 0], [0, 1, -P], [0, 0, 1]], float)  # mask coords -> reference coords

Hs = {R: np.eye(3)}
for direction in (1, -1):
    prev, Hp = ref, np.eye(3)
    rng = range(R + 1, B + 1) if direction == 1 else range(R - 1, A - 1, -1)
    for i in rng:
        cur = load(i)
        Hstep, n = homog(prev, cur)
        Hp = Hstep @ Hp
        Hs[i] = Hp
        print(i, "inliers", n, flush=True)
        prev = cur

os.makedirs(OUT, exist_ok=True)
for i in range(A, B + 1):
    img = load(i)
    Hf = Hs[i]
    # does the rebuilt bay land in this frame?
    m = cv2.warpPerspective(mask_r, Hf @ OFF, (W_, H_))
    if m.max() < 0.01:
        continue
    M = Hf @ T @ np.linalg.inv(Hf)  # dest pixel -> the same spot one floor down, in this frame
    src = cv2.warpPerspective(img, M, (W_, H_), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    # where one floor down falls outside this frame, use the reference frame's floor below
    ones = np.ones((H_, W_), np.float32)
    valid = cv2.warpPerspective(ones, M, (W_, H_), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    fb = cv2.warpPerspective(ref, T @ np.linalg.inv(Hf), (W_, H_), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    src = np.where(valid[..., None] > 0.5, src, fb)
    out = (img * (1 - m[..., None]) + src * m[..., None]).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, f"{i:03d}.png"), out)
    print("fixed", i, flush=True)
