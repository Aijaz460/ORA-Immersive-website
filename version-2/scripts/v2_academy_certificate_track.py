"""Academy step 5 film: track the certificate (a plane) through frames 1..N and print the clean Ora certificate
(from the fixed still) onto it, so it reads properly while it moves."""
import os
import numpy as np, cv2

N = 40
SRC = "f5"
OUT = "f5fix"
os.makedirs(OUT, exist_ok=True)
fixed = cv2.imread("academy-5-cert.png")  # 2048² still with the clean certificate
H0, W0 = 1080, 1080
s = W0 / fixed.shape[1]
# certificate face (frame moulding included) in still coords -> video coords
Qs = np.float32([[1005, 1160], [1305, 1195], [1262, 1430], [915, 1405]])  # whole face: used for tracking
Qin = np.float32([[1036, 1208], [1254, 1227], [1225, 1403], [950, 1389]])  # printed paper only: pasted
Q1 = Qs * s
Qi = Qin * s
tex = cv2.resize(fixed, (W0, H0), interpolation=cv2.INTER_AREA)  # frame-1 texture: the fixed still at video size
# the strip below the printed block (where the old scribbled signature sits) becomes plain paper, so the
# texture never carries frame 1's hand into later frames
_old = np.zeros((H0, W0), np.uint8)
cv2.fillConvexPoly(_old, (np.float32([[1036, 1208], [1254, 1227], [1221, 1394], [953, 1381]]) * s).astype(np.int32), 1)
_new = np.zeros((H0, W0), np.uint8)
cv2.fillConvexPoly(_new, (Qin * s).astype(np.int32), 1)
_paper = np.median(tex[(_old > 0)].reshape(-1, 3), axis=0)
tex[(_new > 0) & (_old == 0)] = _paper

frames = [cv2.imread(os.path.join(SRC, f"{i:03d}.png")) for i in range(1, N + 1)]
g0 = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
roi = np.zeros_like(g0)
cv2.fillConvexPoly(roi, Q1.astype(np.int32), 255)
p0 = cv2.goodFeaturesToTrack(g0, 200, 0.01, 4, mask=roi)
print("features", len(p0))

mask1 = np.zeros((H0, W0), np.float32)
cv2.fillConvexPoly(mask1, Qi.astype(np.int32), 1.0)
mask1 = cv2.GaussianBlur(mask1, (0, 0), 1.4)
# ECC template: frame 1's certificate face
x, y, w, h = cv2.boundingRect(Q1.astype(np.int32))
tmpl = g0.astype(np.float32)
tmask = np.zeros_like(g0)
cv2.fillConvexPoly(tmask, Q1.astype(np.int32), 255)

Hk = np.eye(3)
prev_g, prev_p = g0, p0
for k, fr in enumerate(frames):
    g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
    if k > 0:
        p1, st, _ = cv2.calcOpticalFlowPyrLK(prev_g, g, prev_p, None, winSize=(21, 21), maxLevel=3)
        good0, good1 = prev_p[st == 1], p1[st == 1]
        Hstep, inl = cv2.findHomography(good0, good1, cv2.RANSAC, 1.5)
        Hk = Hstep @ Hk
        # refine against frame 1 directly (no drift): ECC on the certificate face
        try:
            Hn = (Hk / Hk[2, 2]).astype(np.float32)
            _, Hn = cv2.findTransformECC(tmpl, g.astype(np.float32), np.linalg.inv(Hn).astype(np.float32),
                                         cv2.MOTION_HOMOGRAPHY,
                                         (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-5), tmask, 5)
            Hk = np.linalg.inv(Hn.astype(np.float64))
        except cv2.error:
            pass
        prev_p = good1[inl.ravel() == 1].reshape(-1, 1, 2)
        if len(prev_p) < 40:  # top up the tracks inside the current certificate
            roi = np.zeros_like(g)
            cv2.fillConvexPoly(roi, cv2.perspectiveTransform(Q1[None], Hk)[0].astype(np.int32), 255)
            extra = cv2.goodFeaturesToTrack(g, 200, 0.01, 4, mask=roi)
            if extra is not None:
                prev_p = np.vstack([prev_p, extra])
        prev_g = g
    t = cv2.warpPerspective(tex, Hk, (W0, H0), flags=cv2.INTER_LINEAR)
    m = cv2.warpPerspective(mask1, Hk, (W0, H0), flags=cv2.INTER_LINEAR)
    # hands passing over the certificate stay on top
    ycc = cv2.cvtColor(fr, cv2.COLOR_BGR2YCrCb)
    skin = ((ycc[..., 1] > 140) & (ycc[..., 1] < 180) & (ycc[..., 2] < 130)).astype(np.uint8)
    skin = cv2.dilate(cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), np.ones((5, 5), np.uint8))
    m = (m * (1 - cv2.GaussianBlur(skin.astype(np.float32), (0, 0), 1.5)))[..., None]
    out = fr.astype(np.float32) * (1 - m) + t.astype(np.float32) * m
    cv2.imwrite(os.path.join(OUT, f"{k + 1:03d}.png"), np.clip(out, 0, 255).astype(np.uint8))
    if k % 10 == 0:
        print(k + 1, "tracks", len(prev_p))
print("done")
