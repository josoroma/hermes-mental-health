# Sync Verification Script

Run after every `build-video.py` to confirm audio-video sync.
Extracts frames at sub-segment midpoints and diffs them.

## Principle

For multi-screenshot segments, the first-half frame and second-half frame
MUST differ significantly (>50,000 AE pixels). Zero difference means the
second screenshot never appeared — the video showed a stale first screenshot
for the entire segment.

For single-screenshot segments, both halves should show content (mean pixel
value > 1000), not black frames.

## Usage

```bash
cd /path/to/project
python3 docs/verify-sync.py
```

## The script (save as docs/verify-sync.py or paste inline)

```python
import subprocess, os, json

VIDEO = "docs/walkthrough-final.mp4"
with open("docs/video-frames/segments/durations.json") as f:
    durs = json.load(f)

OFFSET = 3.0  # black intro

# Compute cumulative times
t = OFFSET
segs = []
for i, dur in enumerate(durs):
    segs.append((i, t, t + dur, dur))
    t += dur

os.makedirs("/tmp/video-check", exist_ok=True)

# Multi-screenshot segments: split ratio, description
multi = {
    1:  (0.5, "dashboard → assessments"),
    5:  (0.5, "form → form-scrolled"),
    7:  (0.6, "result detail → detail-scrolled"),
    8:  (0.5, "result edit → edit-scrolled"),
    9:  (0.6, "sessions → session-edit"),
    11: (0.5, "editor → editor-fields"),
}

print("Multi-screenshot transitions:")
all_ok = True
for seg_idx, (split, name) in multi.items():
    _, start, end, dur = segs[seg_idx]
    mid_first = start + dur * split * 0.5
    mid_second = start + dur * split + dur * (1 - split) * 0.5

    subprocess.run(["ffmpeg", "-y", "-ss", str(mid_first), "-i", VIDEO,
        "-frames:v", "1", "-update", "1", "/tmp/video-check/a.png"],
        capture_output=True, text=True)
    subprocess.run(["ffmpeg", "-y", "-ss", str(mid_second), "-i", VIDEO,
        "-frames:v", "1", "-update", "1", "/tmp/video-check/b.png"],
        capture_output=True, text=True)

    r = subprocess.run(["compare", "-metric", "AE",
        "/tmp/video-check/a.png", "/tmp/video-check/b.png", "/dev/null"],
        capture_output=True, text=True)
    ae = r.stderr.strip()
    try:
        ae_val = int(float(ae))
        if ae_val > 50000:
            status = "✓"
        else:
            status = f"✗ SAME SCREEN ({ae_val} px) — BROKEN"
            all_ok = False
    except:
        status = f"? {ae}"
        all_ok = False
    print(f"  {status}  t={mid_first:.1f}/{mid_second:.1f}s — {name}")

print("\nSingle-screenshot content check:")
for seg_idx, _, end, dur in segs:
    if seg_idx in multi:
        continue
    mid = end - dur / 2
    out = f"/tmp/video-check/single_{seg_idx}.png"
    subprocess.run(["ffmpeg", "-y", "-ss", str(mid), "-i", VIDEO,
        "-frames:v", "1", "-update", "1", out],
        capture_output=True, text=True)
    r = subprocess.run(["identify", "-format", "%[mean]", out],
        capture_output=True, text=True)
    try:
        mean = float(r.stdout.strip())
        if mean > 1000:
            status = "✓"
        else:
            status = f"✗ DARK (mean={mean:.0f})"
            all_ok = False
    except:
        status = "?"
    print(f"  {status}  t={mid:.1f}s — seg_{seg_idx:02d}")

if all_ok:
    print("\n✓ ALL SEGMENTS VERIFIED")
else:
    print("\n✗ SYNC ISSUES FOUND — investigate before publishing")
```

## Expected output

```
Multi-screenshot transitions:
  ✓  t=14.1/23.3s — dashboard → assessments
  ✓  t=78.0/85.0s — form → form-scrolled
  ✓  t=107.1/117.7s — result detail → detail-scrolled
  ✓  t=126.8/136.5s — result edit → edit-scrolled
  ✓  t=146.5/154.9s — sessions → session-edit
  ✓  t=170.3/174.2s — editor → editor-fields

Single-screenshot content check:
  ✓  t=6.3s — seg_00
  ✓  t=36.9s — seg_02
  ...

✓ ALL SEGMENTS VERIFIED
```

## AE threshold reference

| AE value | Meaning |
|----------|---------|
| 0 | Identical frames — broken (multi-screenshot segment shows same screen) |
| <10,000 | Nearly identical — probably same screenshot with H.264 artifacts |
| 10,000–50,000 | Partial difference — investigate |
| >50,000 | Different screenshots — healthy transition |
| >300,000 | Completely different pages — confirmed transition |
