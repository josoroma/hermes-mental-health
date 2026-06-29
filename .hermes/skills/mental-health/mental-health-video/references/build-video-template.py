#!/usr/bin/env python3
"""Build a narrated walkthrough video from screenshots + TTS audio.

Each screenshot is shown for a duration matching its narration segment.
Logo overlay at intro (0-3s) and outro (last 3s).
Narration is padded with 3s silence at start and end.

Usage:
    python3 docs/build-video.py

Prerequisites:
    - docs/narration.mp3 (TTS audio from edge-tts)
    - docs/screenshots/*.png (1920×1080 page captures)
    - docs/logo.png

Customization:
    Edit the SEGS list below to match your narration segments and screenshots.
    Each tuple is: (screenshot_filename, start_time, end_time)
    Use "_BLACK_" for intro/outro logo-only segments.
"""

import subprocess, os, json

DOCS = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(DOCS, "screenshots")
OUT = os.path.join(DOCS, "walkthrough-final.mp4")
LOGO = os.path.join(DOCS, "logo.png")
NARRATION = os.path.join(DOCS, "narration.mp3")
FRAMES = os.path.join(DOCS, "video-frames")

os.makedirs(FRAMES, exist_ok=True)

# ─── Timeline ─────────────────────────────────────────────────────
# (screenshot_filename, start_time, end_time)
# Total duration must cover: 3s intro silence + narration + 3s outro silence
# Key rule: the screenshot at each timestamp MUST match what the narration
# is describing at that moment.
SEGS = [
    # 0:00-0:03  — Logo intro (black + logo)
    ("_BLACK_",       0.0,   3.0),

    # 0:03-0:15  — Dashboard: Patients table
    ("dashboard.png",            3.0,  15.0),

    # 0:15-0:28  — Dashboard: Custom + Available Assessments
    ("dashboard-assessments.png", 15.0, 28.0),

    # 0:28-0:45  — Patient Profile (scroll: header → clinical summary)
    ("patient-profile.png",     28.0,  42.0),
    ("patient-profile-clinical.png", 42.0, 45.0),

    # 0:45-1:05  — Assessments + patient form
    ("assessments.png",         45.0,  60.0),
    ("assessment-form.png",     60.0,  65.0),

    # 1:05-1:25  — Results List
    ("results.png",             65.0,  85.0),

    # 1:25-1:45  — Result Detail (view mode)
    ("result-dep-followup.png", 85.0, 105.0),

    # 1:45-2:05  — Result Edit (inline editing mode)
    ("result-dep-edit.png",     105.0, 125.0),

    # 2:05-2:25  — Sessions List
    ("sessions.png",            125.0, 145.0),

    # 2:25-2:45  — Session Edit (MDX editor)
    ("session-edit.png",        145.0, 165.0),

    # 2:45-3:03  — Agent Chat
    ("agent-chat-patient.png",  165.0, 183.0),

    # 3:03-3:13  — Logo outro (black + logo)
    ("_BLACK_",                183.0, 193.0),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr[:500]}")
    return r

def main():
    # 1. Create silent video from screenshots via concat demuxer
    print("1. Building video from screenshots...")
    concat_path = os.path.join(FRAMES, "concat.txt")
    with open(concat_path, "w") as f:
        for shot, start, end in SEGS:
            duration = end - start
            if shot == "_BLACK_":
                path = os.path.join(FRAMES, "black.png")
                subprocess.run([
                    "ffmpeg", "-y", "-f", "lavfi", "-i",
                    "color=c=black:s=1920x1080:d=0.1",
                    "-frames:v", "1", path
                ], capture_output=True)
            else:
                path = os.path.join(SHOTS, shot)
            f.write(f"file '{path}'\n")
            f.write(f"duration {duration}\n")
        # Repeat last frame without duration (concat demuxer requirement)
        last = SEGS[-1][0]
        last_path = os.path.join(FRAMES, "black.png") if last == "_BLACK_" else os.path.join(SHOTS, last)
        f.write(f"file '{last_path}'\n")

    silent_video = os.path.join(FRAMES, "silent.mp4")
    r = run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_path,
        "-vf", "fps=30,scale=1920:1080,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        silent_video
    ])
    if r.returncode != 0:
        print("FAILED to build silent video")
        return

    # 2. Pad narration with 3s silence at start and end
    print("\n2. Padding narration audio...")
    silence = os.path.join(FRAMES, "silence.m4a")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", "3", "-c:a", "aac", "-b:a", "192k", silence])

    padded = os.path.join(FRAMES, "narration-padded.m4a")
    run(["ffmpeg", "-y", "-i", silence, "-i", NARRATION, "-i", silence,
         "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1",
         "-c:a", "aac", "-b:a", "192k", padded])

    # 3. Compose: silent video + padded narration + logo overlay
    print("\n3. Composing final video with logo + narration...")
    dur_r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", silent_video],
        capture_output=True, text=True
    )
    dur = float(dur_r.stdout.strip())
    last_start = dur - 3
    print(f"  Video duration: {dur:.1f}s, logo outro starts at {last_start:.1f}s")

    r = run([
        "ffmpeg", "-y",
        "-i", silent_video,
        "-i", LOGO,
        "-i", padded,
        "-filter_complex",
        f"[1:v]scale=440:-1[logo];"
        f"[0:v][logo]overlay=(W-w)/2:(H-h)/2:"
        f"enable='between(t,0,3)+between(t,{last_start},{dur})'",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-map", "0:v:0", "-map", "2:a:0",
        OUT
    ])

    if r.returncode == 0:
        print(f"\n✓ Video created: {OUT}")
        v = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries",
             "format=duration:stream=codec_name,codec_type,width,height",
             "-of", "json", OUT],
            capture_output=True, text=True
        )
        info = json.loads(v.stdout)
        dur = info.get("format", {}).get("duration", "?")
        print(f"  Duration: {dur}s")
        for s in info.get("streams", []):
            print(f"  {s.get('codec_type')}: {s.get('codec_name')} "
                  f"{s.get('width','')}x{s.get('height','')}")
    else:
        print("\n✗ FAILED to compose video")

if __name__ == "__main__":
    main()
