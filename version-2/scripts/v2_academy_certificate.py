"""Replace the garbled certificate text in academy-5 with a clean Ora Academy certificate, in perspective."""
import math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "/Users/mohammad.aijaz/Desktop/AGI-Projects/ORA /ora-web/source/footage/v2/academy-5.png"
OUT = "academy-5-cert.png"
F = "/System/Library/Fonts/Supplemental/"
# inner panel (inside the ornamental border), full-res photo coords: TL, TR, BR, BL
Q = np.float32([[1030, 1202.5], [1260, 1222.5], [1226, 1404], [948, 1389]])

W, H = 1200, 900
_ph = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
paper = tuple(int(v) for v in np.median(_ph[1250:1300, 1080:1180].reshape(-1, 3), axis=0))  # the photo's own paper
ink = (71, 21, 15)
gold = (176, 138, 74)
art = Image.new("RGB", (W, H), paper)
d = ImageDraw.Draw(art)


def font(name, size, idx=0):
    return ImageFont.truetype(F + name, size, index=idx)


def ctext(y, s, f, fill):
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=fill)


# the Ora star: four petals and a centre
cx, cy, r = W / 2, 120, 46
for a in range(4):
    ang = math.radians(a * 90)
    px, py = cx + math.cos(ang) * r * 0.55, cy + math.sin(ang) * r * 0.55
    pet = Image.new("L", (W, H), 0)
    pd = ImageDraw.Draw(pet)
    pd.ellipse([px - r * 0.62, py - r * 0.34, px + r * 0.62, py + r * 0.34], fill=255)
    pet = pet.rotate(-a * 90, center=(px, py))
    art.paste(Image.new("RGB", (W, H), ink), (0, 0), pet)
d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=paper)

ctext(185, "O R A   A C A D E M Y", font("Georgia Bold.ttf", 34), gold)
ctext(250, "Certificate of Completion", font("Georgia Italic.ttf", 86), ink)
ctext(375, "This certifies that", font("Georgia.ttf", 34), (110, 80, 70))
ctext(425, "Paolo Reyes", font("Georgia Bold.ttf", 78), ink)
d.line([(330, 525), (870, 525)], fill=gold, width=5)
ctext(548, "has completed Ora technician training in", font("Georgia.ttf", 32), (110, 80, 70))
ctext(592, "Plumbing & Fixtures  ·  Safety & Home Care", font("Georgia Bold.ttf", 34), ink)
# signatures
for x0, label in ((150, "Head of Academy"), (720, "Senior Instructor")):
    d.line([(x0, 760), (x0 + 330, 760)], fill=(120, 95, 80), width=4)
    d.text((x0 + 60, 772), label, font=font("Georgia.ttf", 28), fill=(120, 95, 80))
# a gold seal
d.ellipse([545, 690, 655, 800], fill=gold)
d.ellipse([560, 705, 640, 785], outline=paper, width=4)

# into the photo: erase only the garbled print from the photo's own paper, then print ours onto it
photo = Image.open(SRC).convert("RGB")
pw, ph = photo.size
pa = np.asarray(photo).copy()
M = cv2.getPerspectiveTransform(np.float32([[0, 0], [W, 0], [W, H], [0, H]]), Q)
region = cv2.warpPerspective(np.full((H, W), 255, np.uint8), M, (pw, ph), flags=cv2.INTER_NEAREST)
region = cv2.erode(region, np.ones((9, 9), np.uint8))  # stay inside the printed border
gray = cv2.cvtColor(pa, cv2.COLOR_RGB2GRAY).astype(np.float32)
local = cv2.medianBlur(gray.astype(np.uint8), 21).astype(np.float32)
ink_mask = ((local - gray) > 10) & (region > 0)
ink_mask = cv2.dilate(ink_mask.astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
clean = cv2.inpaint(pa, ink_mask, 6, cv2.INPAINT_TELEA)
# our print as ink only: darkness over the real paper (multiply), so texture and light stay the photo's
art_np = np.asarray(art).astype(np.float32)
ink_layer = np.clip(art_np / np.array(paper, np.float32), 0, 1)  # 1 = paper, <1 = ink
ink_w = cv2.warpPerspective(ink_layer, M, (pw, ph), flags=cv2.INTER_LINEAR, borderValue=(1, 1, 1))
ink_w = cv2.GaussianBlur(ink_w, (0, 0), 0.6)
out = clean.astype(np.float32) * ink_w
out += np.random.default_rng(5).normal(0, 1.8, out.shape) * (ink_w < 0.98)
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
res.save(OUT)
res.crop((850, 1100, 1350, 1500)).resize((1000, 800)).save("cert-after.jpg")
print("ok")
