#!/usr/bin/env python3
"""Build the walkthrough video from screenshots + per-segment narration audio.
Each segment's TTS audio is matched to its screenshot, guaranteeing sync.
Logo overlay at intro (0-3s) and outro (last 3s).

Sync strategy: every screenshot shown maps to what the narration is describing
at that exact moment. When narration mentions an action (clicking, scrolling),
the video shows the result of that action.
"""

import subprocess, os, json

DOCS = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(DOCS, "screenshots")
SEG_AUDIO = os.path.join(DOCS, "video-frames", "segments")
FRAMES = os.path.join(DOCS, "video-frames")
OUT = os.path.join(DOCS, "walkthrough-final.mp4")
LOGO = os.path.join(DOCS, "logo.png")

with open(os.path.join(SEG_AUDIO, "durations.json")) as f:
    seg_durations = json.load(f)

# ─── Timeline — narration-to-screenshot alignment ─────────────────
SEGS = [
    # ═══ Seg 0: Welcome ├ 6.5s ───
    ([("dashboard.png", 1.0)], 0),

    # ═══ Seg 1: Dashboard overview ├ 18.3s ───
    ([("dashboard.png", 0.5), ("dashboard-assessments.png", 0.5)], 1),

    # ═══ Seg 2: Patient Profile top ├ 18.1s ───
    ([("patient-profile.png", 1.0)], 2),

    # ═══ Seg 3: Clinical Summary scrolled ├ 15.1s ───
    ([("patient-profile-clinical.png", 1.0)], 3),

    # ═══ Seg 4: Assessments page ├ 13.4s ───
    ([("assessments.png", 1.0)], 4),

    # ═══ Seg 5: Assessment form ├ 14.1s ───
    ([("assessment-form.png", 0.5), ("assessment-form-scrolled.png", 0.5)], 5),

    # ═══ Seg 6: Results list ├ 12.3s ───
    ([("results.png", 1.0)], 6),

    # ═══ Seg 7: Result detail view ├ 21.1s ───
    ([("result-dep-followup.png", 0.6), ("result-dep-followup-scrolled.png", 0.4)], 7),

    # ═══ Seg 8: Result edit mode ├ 19.5s ───
    ([("result-dep-edit.png", 0.5), ("result-dep-edit-scrolled.png", 0.5)], 8),

    # ═══ Seg 9: Sessions + MDX Editor ├ 16.9s ───
    ([("sessions.png", 0.6), ("session-edit.png", 0.4)], 9),

    # ═══ Seg 10: Agent Chat ├ 10.0s ───
    ([("agent-chat-patient.png", 1.0)], 10),

    # ═══ Seg 11: Assessment Editor ├ 7.9s ───
    ([("editor.png", 0.5), ("editor-fields.png", 0.5)], 11),

    # ═══ Seg 12: Closing summary ├ 14.8s ───
    ([("dashboard.png", 1.0)], 12),
]

def run(cmd):
    print(f"  $ {' '.join(str(c) for c in cmd[:6])}...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr[:500]}")
    return r

def main():
    os.makedirs(FRAMES, exist_ok=True)

    # ═══════════════════════════════════════════════════════════════
    # 1. Build per-segment video clips (screenshot + audio)
    # ═══════════════════════════════════════════════════════════════
    print("1. Building per-segment video clips...")
    clips = []
    for i, (shots, seg_idx) in enumerate(SEGS):
        seg_dur = seg_durations[seg_idx]
        seg_audio = os.path.join(SEG_AUDIO, f"seg_{seg_idx:02d}.mp3")

        if len(shots) == 1:
            shot_name, _ = shots[0]
            clip_path = os.path.join(FRAMES, f"clip_{i:02d}.mp4")
            run([
                "ffmpeg", "-y",
                "-loop", "1", "-i", os.path.join(SHOTS, shot_name),
                "-i", seg_audio,
                "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                "-t", f"{seg_dur}",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                clip_path
            ])
            clips.append(clip_path)
            print(f"  clip_{i:02d}: {shot_name} × {seg_dur:.1f}s (seg {seg_idx})")
        else:
            sub_clips = []
            for j, (shot_name, ratio) in enumerate(shots):
                sub_dur = seg_dur * ratio
                sp = os.path.join(FRAMES, f"clip_{i:02d}_{j}.mp4")
                run([
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", os.path.join(SHOTS, shot_name),
                    "-t", f"{sub_dur}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p",
                    "-an",
                    sp
                ])
                sub_clips.append(sp)

            concat_list = os.path.join(FRAMES, f"concat_{i:02d}.txt")
            with open(concat_list, "w") as f:
                for sc in sub_clips:
                    f.write(f"file '{sc}'\n")

            merged = os.path.join(FRAMES, f"merged_{i:02d}.mp4")
            run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                 "-i", concat_list, "-c", "copy", merged])

            clip_path = os.path.join(FRAMES, f"clip_{i:02d}.mp4")
            run([
                "ffmpeg", "-y",
                "-i", merged, "-i", seg_audio,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest", clip_path
            ])
            clips.append(clip_path)
            print(f"  clip_{i:02d}: {' → '.join(s[0] for s in shots)} × {seg_dur:.1f}s (seg {seg_idx})")

    # ═══════════════════════════════════════════════════════════════
    # 2. Concatenate all clips into one stream
    # ═══════════════════════════════════════════════════════════════
    print("\n2. Concatenating all clips...")
    concat_all = os.path.join(FRAMES, "concat_all.txt")
    with open(concat_all, "w") as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")

    content_video = os.path.join(FRAMES, "content.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", concat_all, "-c", "copy", content_video])

    # ═══════════════════════════════════════════════════════════════
    # 3. Build padded audio (3s silence + content + 3s silence)
    # ═══════════════════════════════════════════════════════════════
    print("\n3. Building padded audio...")
    silence = os.path.join(FRAMES, "silence_3s.m4a")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
         "-t", "3", "-c:a", "aac", "-b:a", "192k", silence])

    content_audio = os.path.join(FRAMES, "content_audio.m4a")
    run(["ffmpeg", "-y", "-i", content_video, "-vn", "-c:a", "copy", content_audio])

    narration_audio = os.path.join(FRAMES, "narration_padded.m4a")
    run([
        "ffmpeg", "-y",
        "-i", silence, "-i", content_audio, "-i", silence,
        "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1",
        "-c:a", "aac", "-b:a", "192k", narration_audio
    ])

    # ═══════════════════════════════════════════════════════════════
    # 4. Compose final video: content + black padding + logo overlay + narration
    # ═══════════════════════════════════════════════════════════════
    print("\n4. Composing final video...")

    # Get content duration for logo outro timing
    dr = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", content_video],
        capture_output=True, text=True
    )
    content_dur = float(dr.stdout.strip())
    # After 3s padding at each end: total = content_dur + 6
    total_dur = content_dur + 6
    logo_outro_start = total_dur - 3
    print(f"  Content: {content_dur:.1f}s, total: {total_dur:.1f}s, logo at: 0-3s + {logo_outro_start:.1f}-{total_dur:.1f}s")

    r = run([
        "ffmpeg", "-y",
        "-i", content_video,
        "-i", LOGO,
        "-i", narration_audio,
        "-filter_complex",
        # Pad 90 black frames (3s @ 30fps) at start and end
        f"[0:v]tpad=start=90:stop=90:color=black[vid];"
        # Scale logo
        f"[1:v]scale=440:-1[logo];"
        # Overlay logo during intro (t=0-3) and outro (last 3s)
        f"[vid][logo]overlay=(W-w)/2:(H-h)/2:"
        f"enable='between(t,0,3)+between(t,{logo_outro_start},{total_dur})'[outv]",
        "-map", "[outv]", "-map", "2:a:0",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
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
        dur_s = info.get("format", {}).get("duration", "?")
        print(f"  Duration: {dur_s}s")
        for s in info.get("streams", []):
            print(f"  {s.get('codec_type')}: {s.get('codec_name')} "
                  f"{s.get('width','')}x{s.get('height','')}")
    else:
        print("\n✗ FAILED to compose video")
        raise SystemExit(1)

if __name__ == "__main__":
    main()