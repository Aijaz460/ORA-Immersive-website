"""Academy films for Steps 01, 02, 03 and 05 from the supplied clips in ../Ora_videos (step{n}.mp4).

The video streams are copied untouched (same resolution and bitrate as supplied); only the audio and the
container metadata are dropped and the index moved up front for quick start. The poster for each is the
clip's own first frame, so nothing changes when the film starts. Step 04 (Conduct & safety) is left as is.

Where an upscaled 2K master exists (../assets-raw/academy/step{n}-2k-master.mp4) it is used instead, re-encoded
at near-lossless quality (CRF 18, 2560x1440) to stay under the published page's per-file limit.
"""
import os
import subprocess

FF = os.environ.get("FFMPEG", "ffmpeg")
SRC = os.path.join("..", "Ora_videos")
OUT = os.path.join("public", "v2", "academy")

for n in (1, 2, 3, 5):
    src = os.path.join(SRC, f"step{n}.mp4")
    mp4 = os.path.join(OUT, f"{n}.mp4")
    master = os.path.join("..", "assets-raw", "academy", f"step{n}-2k-master.mp4")
    if os.path.exists(master):
        src = master
        codec = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p"]
    else:
        codec = ["-c:v", "copy"]
    subprocess.run([FF, "-v", "error", "-y", "-i", src, "-map", "0:v:0", *codec, "-an",
                    "-map_metadata", "-1", "-map_chapters", "-1", "-metadata:s:v", "handler_name=",
                    "-movflags", "+faststart", mp4], check=True)
    subprocess.run([FF, "-v", "error", "-y", "-i", mp4, "-frames:v", "1", "-c:v", "libwebp", "-quality", "90",
                    os.path.join(OUT, f"{n}.webp")], check=True)
    print(mp4, os.path.getsize(mp4) // 1024, "KB")
