"""Step 03 confirmation screen (Figma 92:15185 "Order Validation - Confirmation Review", exported 3x) for V2.

Writes public/app/conf.webp (full screen), conf-base.webp (the screen without its glass card) and
conf-card.webp (the glass card, rounded alpha) at 3x, so the camera can push into the screen and stay sharp.
The plumber thumbnail is replaced by the exact crop of the Step 04 photo (public/v2/img/tech-phone.webp) that
the zoom opens out of (AVATAR_SRC in src/v2/JourneyV2.tsx must match R below).
"""
import sys
from PIL import Image, ImageDraw

SRC = sys.argv[1] if len(sys.argv) > 1 else "conf"  # folder with full.png and base.png (3x exports)
S = 3
AVATAR = (251, 468, 48, 48, 4)  # x, y, w, h, radius (app px)
R = (18, 15, 380, 380)  # region of the Step 04 photo (app px) shown in the thumbnail
CARD = (16, 209, 380, 669, 32)


def rounded(size, r):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return m


full = Image.open(f"{SRC}/full.png").convert("RGB")
base = Image.open(f"{SRC}/base.png").convert("RGB")
photo = Image.open("public/v2/img/tech-phone.webp").convert("RGB")
k = photo.width / 412  # photo px per app px
x, y, w, h, r = AVATAR
crop = photo.crop((round(R[0] * k), round(R[1] * k), round((R[0] + R[2]) * k), round((R[1] + R[3]) * k)))
av = crop.resize((w * S, h * S), Image.LANCZOS)
full.paste(av, (x * S, y * S), rounded(av.size, r * S))

full.save("public/app/conf.webp", quality=88, method=6)
base.save("public/app/conf-base.webp", quality=88, method=6)
cx, cy, cw, ch, cr = CARD
card = full.crop((cx * S, cy * S, (cx + cw) * S, (cy + ch) * S)).convert("RGBA")
card.putalpha(rounded(card.size, cr * S))
card.save("public/app/conf-card.webp", quality=88, method=6)
print("ok", full.size, card.size)
