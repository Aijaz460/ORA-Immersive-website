"""Academy films: each clip's calm opening as a seamless forward-and-back loop (H.264, no audio, no metadata)."""
import os, shutil, subprocess

AC = "/private/tmp/claude-1101983242/-Users-mohammad-aijaz-Desktop-AGI-Projects-ORA-/f7089f3c-d4f7-4b0b-b015-3a7104d6356a/scratchpad/ac"
FF = "/Users/mohammad.aijaz/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
OUT = os.path.join(AC, "loops")
WORK = os.path.join(AC, "work")
os.makedirs(OUT, exist_ok=True)


def fresh(d):
    assert d.startswith(AC + "/"), d  # only ever inside this scratch folder
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)


def pingpong(src, first, last, out):
    fresh(WORK)
    seq = list(range(first, last + 1)) + list(range(last - 1, first, -1))
    for n, i in enumerate(seq, 1):
        shutil.copy(os.path.join(src, f"{i:03d}.png"), os.path.join(WORK, f"{n:04d}.png"))
    subprocess.run([FF, "-v", "error", "-y", "-framerate", "24", "-i", os.path.join(WORK, "%04d.png"),
                    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-an", "-map_metadata", "-1", out], check=True)
    print(out, len(seq), "frames")


# step 1: only frames 1-8 are calm; slow them 3x with motion interpolation, then loop
calm = os.path.join(AC, "f1calm")
fresh(calm)
for i in range(1, 9):
    shutil.copy(os.path.join(AC, "f1", f"{i:03d}.png"), os.path.join(calm, f"{i:03d}.png"))
slow = os.path.join(AC, "f1s")
fresh(slow)
subprocess.run([FF, "-v", "error", "-y", "-framerate", "8", "-i", os.path.join(calm, "%03d.png"),
                "-vf", "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:vsbmc=1", "-pix_fmt", "rgb24",
                os.path.join(slow, "%03d.png")], check=True)
k = len([f for f in os.listdir(slow) if f.endswith(".png")])
pingpong(slow, 1, k, os.path.join(OUT, "1.mp4"))
pingpong(os.path.join(AC, "f2"), 1, 48, os.path.join(OUT, "2.mp4"))
pingpong(os.path.join(AC, "f3"), 1, 40, os.path.join(OUT, "3.mp4"))
pingpong(os.path.join(AC, "f4"), 1, 56, os.path.join(OUT, "4.mp4"))
pingpong(os.path.join(AC, "f5fix"), 1, 40, os.path.join(OUT, "5.mp4"))
