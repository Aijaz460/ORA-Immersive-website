"""V2 date screen (Figma 2:13867) with the hand-and-pipe photo refitted above the glass card (scale 0.7,
+135/-25 app px, applied in a temporary Figma copy and exported 2x). Writes public/v2/app/date.webp,
date-base.webp and date-card.webp (the glass card crop, rounded alpha) — V1 keeps public/app/date*.webp."""
import sys
from PIL import Image, ImageDraw

SRC = sys.argv[1]  # folder with full.png and base.png
S, (x, y, w, h, r) = 2, (16, 456, 380, 412, 32)
full = Image.open(f"{SRC}/full.png").convert("RGB")
Image.open(f"{SRC}/base.png").convert("RGB").save("public/v2/app/date-base.webp", quality=88, method=6)
full.save("public/v2/app/date.webp", quality=88, method=6)
card = full.crop((x * S, y * S, (x + w) * S, (y + h) * S)).convert("RGBA")
m = Image.new("L", card.size, 0)
ImageDraw.Draw(m).rounded_rectangle((0, 0, card.width - 1, card.height - 1), r * S, fill=255)
card.putalpha(m)
card.save("public/v2/app/date-card.webp", quality=88, method=6)
print("ok")
