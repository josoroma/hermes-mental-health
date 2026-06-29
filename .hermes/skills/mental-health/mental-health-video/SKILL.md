---
name: mental-health-video
description: Create narrated walkthrough videos and screencasts for the Hermes Mental Health practitioner tutorial. Record, narrate, and publish to GitHub Pages.
version: 0.4.0
author: hermes-mental-health
license: MIT
metadata:
  hermes:
    tags: [mental-health, video, tutorial, walkthrough, screencast]
    category: mental-health
    related_skills:
      - mental-health-core
      - mental-health-dashboard
---

# Mental Health Video & Walkthrough

## When to use

Use when the practitioner needs to:
- Create narrated walkthrough videos of the app
- Record screencasts demonstrating workflows
- Publish tutorial content to GitHub Pages
- Document the 7-part practitioner tutorial as video
- **Regenerate** or **fix** an existing walkthrough video (wrong screen shown, narration mismatch, stale screenshots)

## Two pipelines (choose based on reliability needs)

### Pipeline A: Per-segment sync slideshow (PREFERRED — most reliable)

Capture each page state as a 1920×1080 PNG, then compose a timed slideshow
where each screenshot's duration is driven by its own per-segment TTS audio file.
This guarantees audio-video sync — no timestamp guessing, no drift.

More reliable than live recording because:

- No dependency on Edge AppleScript JS execution (which is often blocked)
- Each frame is exactly the right screen — no timing drift
- **Per-segment TTS**: each narration segment is generated as a separate MP3,
  its actual duration measured via `ffprobe`, and that duration drives the
  screenshot display time. This eliminates sync drift entirely.
- Reproducible: re-run `python3 docs/build-video.py` after updating screenshots or narration
- Clean transitions, no partial renders or loading states

**Steps:**

1. **Prepare the app** — `npm run dev`, seed demo patient data
2. **Write narration** — `docs/narration.txt` (English, under 3,500 chars for ~3-min runtime)
3. **Split narration into segments** — `docs/narration-segments.txt` with `---` delimiters between segments
4. **Generate per-segment TTS** — each segment as a separate MP3 via `edge-tts`
5. **Measure each segment's duration** — `ffprobe` on each segment MP3 → `durations.json`
6. **Capture screenshots** — use **Playwright headless Chromium** (see below), NOT `screencapture -D2`
7. **Build video** — `python3 docs/build-video.py` (maps screenshots to segment durations, adds logo intro/outro, pads with 3s black via `tpad` filter)
8. **Output** — `docs/walkthrough-final.mp4` (30 fps, libx264, AAC 192kbps)

**Video padding architecture:** Use ffmpeg's `tpad` filter to add 3s of black frames
at start and end. Do NOT generate separate black clips and concatenate them with `-c copy` —
the H.264 bitstream concat corrupts frame references, causing multi-screenshot segments
to display only the first screenshot (silent regression, only detectable via frame extraction).

```bash
# CORRECT — tpad in filter_complex (single encode pass, no seeking corruption)
ffmpeg -i content.mp4 -i logo.png -i narration.m4a \
  -filter_complex "
    [0:v]tpad=start=90:stop=90:color=black[vid];
    [1:v]scale=440:-1[logo];
    [vid][logo]overlay=(W-w)/2:(H-h)/2:enable='...'[outv]
  " -map "[outv]" -map 2:a:0 out.mp4

# WRONG — separate black clips + concat breaks multi-screenshot segments
ffmpeg -f concat -i "file 'black.mp4'\nfile 'content.mp4'\nfile 'black.mp4'" -c copy broken.mp4
```

### Screenshot capture: Playwright (PREFERRED)

Use `docs/capture-screens.js` (see `scripts/capture-screens.js` for template).
Playwright headless Chromium is the most reliable method:

- No dependency on display 2, Edge, or AppleScript
- Can click buttons (e.g., Responses "Edit" button) via `page.locator()` + `.click()`
- Can scroll via `page.evaluate(() => window.scrollTo(0, N))`
- Consistent 1920×1080 viewport every time
- Can capture edit-mode states (click Edit → screenshot) in the same run

```bash
# Install Playwright + Chromium browser (one-time)
npm install playwright
npx playwright install chromium

# Capture all screenshots
node docs/capture-screens.js
```

**Pitfall — stale duplicate screenshots:** If `dashboard.png` and `dashboard-assessments.png`
have identical MD5 hashes, they were captured at the same scroll position. Verify uniqueness
with `md5 docs/screenshots/*.png` after capture. This was the root cause of a video that
appeared to "start with the editor" — the dashboard screenshots were identical, so the
video showed the wrong content during the dashboard narration segment.

**Pitfall — editor 404:** The route `/editor/<slug>` requires a slug that exists in
`data/shared/templates/json/`. `phq-9` does NOT exist — use `level1-adult` or another
valid slug. Check available slugs: `ls data/shared/templates/json/ | head -5`.

**Pitfall — agent-chat 404:** The route `/patients/<id>/agent-chat` does NOT exist.
The Agent Chat lives at `/agent`, optionally with query params for patient context:
`/agent?sessions&patientId=<id>`. A 404 screenshot is ~19KB — real agent page is 60KB+.
Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/agent`.

**Pitfall — missing assessment form screenshot:** The patient-facing assessment form
(`/a/<token>`) must have its own screenshot and narration segment. Skipping it causes
the video to jump from Assessments directly to Results without showing the form.
Always include `assessment-form.png` (and optionally a scrolled variant) in the
screenshot list and the narration timeline.

### Screenshot capture: screencapture + Edge (fallback)

Only use if Playwright is unavailable. Requires Edge on display 2.

```bash
# Activate Edge, navigate, wait for render, capture display 2
open -a "Microsoft Edge" "http://localhost:3000/patients/<id>/results/<resultId>"
sleep 3
screencapture -o -x -D2 docs/screenshots/result-detail.png
```

**Pitfall — cannot click web elements via AppleScript/cliclick:**
- Edge's "Allow JavaScript from Apple Events" menu toggle may appear to click
  but remain unchecked, blocking all `execute javascript` AppleScript calls.
- `cliclick c:x,y` requires the correct global coordinate offset (display 2 origin
  is not (0,0) — use `displayplacer list` to find the origin).
- For edit-mode screenshots, use Playwright or the Hermes embedded browser tools
  (`browser_navigate` → `browser_console` JS click → `screencapture`).

### Pipeline B: Live screen recording (fallback — when motion/interaction is essential)

Use only when the video must show live interaction (scrolling, typing, real-time
chart updates). Requires Edge "Allow JavaScript from Apple Events" to be enabled.

1. Start `ffmpeg -f avfoundation -framerate 30 -video_device_index 2` recording in background
2. Run orchestration script (`docs/orchestrate.py`) to navigate pages via AppleScript
3. Compose with logo overlay + padded narration

**Pitfall:** Edge's "Allow JavaScript from Apple Events" menu toggle
(`View → Developer → Allow JavaScript from Apple Events`) may appear to click
but remain unchecked, blocking all `execute javascript` AppleScript calls.
If this happens, fall back to Pipeline A.

## Screenshot capture (legacy — see Playwright above)

```bash
# Activate Edge, navigate, wait for render, capture display 2
open -a "Microsoft Edge" "http://localhost:3000/patients/<id>/results/<resultId>"
sleep 3
screencapture -o -x -D2 docs/screenshots/result-detail.png
```

For edit-mode screenshots, use the Hermes embedded browser tools
(`browser_navigate` → `browser_console` to click Edit via JS → `screencapture`)
since Edge AppleScript JS may be blocked.

## Per-segment TTS generation (CRITICAL for sync)

**Do NOT generate a single monolithic `narration.mp3` and then guess timestamps.**
That approach causes audio-video drift — the narration says one thing while the
video shows another.

Instead:

1. **Split narration** into segments in `docs/narration-segments.txt`, separated by `---` lines
2. **Generate each segment** as a separate MP3: `docs/video-frames/segments/seg_00.mp3`, `seg_01.mp3`, ...
3. **Measure each segment's actual duration** via `ffprobe` → save to `durations.json`
4. **Map screenshots to segments** in `build-video.py` — each segment's duration drives
   how long its screenshot(s) are shown

```bash
# Generate per-segment TTS
.venv/bin/python3 << 'PYEOF'
import asyncio, edge_tts, os, subprocess, json

with open("docs/narration-segments.txt") as f:
    segments = [s.strip() for s in f.read().split("---\n") if s.strip()]

TMP = "docs/video-frames/segments"
os.makedirs(TMP, exist_ok=True)

async def gen_segment(text, idx):
    path = os.path.join(TMP, f"seg_{idx:02d}.mp3")
    communicate = edge_tts.Communicate(text, "en-US-JennyNeural", rate="+3%", pitch="+2Hz")
    await communicate.save(path)
    return path

async def main():
    for i, seg in enumerate(segments):
        await gen_segment(seg, i)

asyncio.run(main())

# Measure durations
durations = []
for i in range(len(segments)):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                       "-of", "default=noprint_wrappers=1:nokey=1", f"{TMP}/seg_{i:02d}.mp3"],
                      capture_output=True, text=True)
    durations.append(float(r.stdout.strip()))

with open(f"{TMP}/durations.json", "w") as f:
    json.dump(durations, f)
print(f"Total: {sum(durations):.1f}s across {len(durations)} segments")
PYEOF
```

**Pitfall — monolithic narration drift:** A single `narration.mp3` forces you to
hardcode timestamps in `build-video.py` (e.g., `dashboard.png` from 3.0s to 15.0s).
If the TTS engine generates audio slightly faster or slower than expected, the
screens drift out of sync. Per-segment TTS eliminates this: each screenshot is
shown for exactly the duration of its matching audio segment.

## Timeline alignment

The screenshot timeline MUST match the narration segments exactly. Misalignment
causes the video to show the wrong screen during narration — e.g., showing
Sessions while the narration describes Result Edit.

**The cardinal rule:** When narration describes a visual state (a page, a section,
an edit mode), the screenshot shown at that moment MUST be a screenshot of that
state. When narration says "clicking Edit opens the MDX editor", the video must
show `session-edit.png`, not `sessions.png`. When narration says "the answers
section breaks down each item", the video must show the scrolled result detail
with answers visible.

**Dashboard splitting:** The dashboard has two visually distinct sections
(patients table, assessments library). Use two separate screenshots
(`dashboard.png` + `dashboard-assessments.png`) mapped to two timeline
segments so the narration about patients syncs with the patients screenshot
and the narration about assessments syncs with the assessments screenshot.

**Process:**
1. Read `docs/narration-segments.txt` and identify natural segment boundaries
2. Map each segment to screenshot(s) that show what the narration describes
3. For multi-screenshot segments, define split ratios in `docs/build-video.py`
4. After building, run the verification script (`references/sync-verification.md`) —
   extract frames at sub-segment midpoints and confirm transitions happen
5. Fix any segment where mid-subsegment frames are identical (AE=0)

```bash
# Quick manual check: extract frames at adjacent sub-segment timestamps
ffmpeg -y -ss <t_first> -i docs/walkthrough-final.mp4 -frames:v 1 /tmp/a.png
ffmpeg -y -ss <t_second> -i docs/walkthrough-final.mp4 -frames:v 1 /tmp/b.png
compare -metric AE /tmp/a.png /tmp/b.png /dev/null
# >50000 = different screens (good). <1000 = same screen (broken).
```

**Frame-diff verification:** Use ImageMagick `compare -metric AE` to confirm
two adjacent segments show different screens (i.e., the transition happened):
```bash
# Extract frames at two adjacent timestamps
ffmpeg -y -ss 118 -i docs/walkthrough-final.mp4 -frames:v 1 -update 1 /tmp/frame-a.png
ffmpeg -y -ss 138 -i docs/walkthrough-final.mp4 -frames:v 1 -update 1 /tmp/frame-b.png
# Should show a large AE value (many pixels differ) if the screens are different
compare -metric AE /tmp/frame-a.png /tmp/frame-b.png /dev/null
```

## Data IDs needed for navigation

| Entity | Where to find | Example |
|--------|---------------|---------|
| Patient ID | `data/patients/<dir>/profile.json` → `patientId` | `josoroma-mqn4h6m8` |
| Result ID | `data/patients/<id>/results/*.json` → `resultId` | `result-1782700000004-demo4` |
| Invite token | `data/patients/<id>/invites/*.json` → `token` | `demo-pending-form-token-abcdef12` |

## Narration language

All narration is in English. The practitioner audience is English-speaking.
Technical terms (PHQ-9, DSM-5-TR, PROMIS, T-score) are used as-is.

## Video topics (7 parts)

| Part | Topic | Duration |
|------|-------|----------|
| 1 | Dashboard overview | 2-3 min |
| 2 | Patient Profile (tabs, summary, history) | 3-4 min |
| 3 | Assessment Invites (token generation, links) | 2-3 min |
| 4 | Taking Assessments (patient-facing form) | 3-4 min |
| 5 | Results & Scoring (charts, severity, data quality) | 3-4 min |
| 6 | Assessment Editor (metadata, fields, scoring rules) | 4-5 min |
| 7 | .hermes Runtime (agents, hooks, commands) | 5-6 min |

## Publishing

Publish to a fresh GitHub repo (no legacy code), README with GitHub Pages link.
Repository should expose only the tutorial site, never the project source code.

## Key files

| File | Role |
|------|------|
| `docs/narration.txt` | Full English script (single block) |
| `docs/narration-segments.txt` | Script split into segments by `---` delimiters |
| `docs/narration.mp3` | Full TTS audio (edge-tts, JennyNeural) — used for reference only |
| `docs/video-frames/segments/seg_*.mp3` | Per-segment TTS audio (drives screenshot timing) |
| `docs/video-frames/segments/durations.json` | Measured duration of each segment MP3 |
| `docs/build-video.py` | Per-segment video pipeline (Pipeline A) — copy from `templates/build-video.py` |
| `docs/capture-screens.js` | Playwright screenshot capture — copy from `scripts/capture-screens.js` |
| `docs/orchestrate.py` | Live recording orchestration (Pipeline B) |
| `docs/walkthrough-final.mp4` | Composed video with narration |
| `docs/logo.png` | Logo overlay for intro/outro |
| `docs/screenshots/` | All page screenshots (1920×1080) |
| `docs/VIDEO.md` | Pipeline documentation |
| `docs/verify-sync.py` | Post-build sync verification (compare mid-subsegment frames) |

**Support files in this skill:**
- `scripts/capture-screens.js` — Playwright script: 18 screenshots at 1920×1080 (includes scrolled variants, edit-mode states, tab views)
- `templates/build-video.py` — ffmpeg pipeline with per-segment TTS sync + `tpad` black padding (no intermediate concat)
- `references/narration-segments.md` — segment-to-screenshot mapping template and rules for splitting narration
- `references/sync-verification.md` — post-build verification script: extracts mid-subsegment frames and diffs them

## Regeneration workflow (when fixing a wrong screen or sync issue)

When the user reports the video shows the wrong page at some point, or audio
is out of sync with the video:

1. **Read** `docs/narration-segments.txt` — identify which segment maps to which screen
2. **Verify** existing screenshots cover the needed page state
3. **Check for stale duplicates:** `md5 docs/screenshots/*.png` — if two screenshots
   have the same hash, recapture them with different scroll positions
4. **If a screenshot is missing or stale:** capture it fresh via `node docs/capture-screens.js`
5. **Regenerate per-segment TTS** if narration changed:
   ```bash
   .venv/bin/python3 -c "
   import asyncio, edge_tts, os, subprocess, json
   # ... (see 'Per-segment TTS generation' section above)
   "
   ```
6. **Rebuild:** `python3 docs/build-video.py`
7. **Verify sync** — run the verification script from `references/sync-verification.md`:
   extract mid-subsegment frames and diff them. Every multi-screenshot segment
   must show >50,000 AE between first-half and second-half frames. Zero difference
   means a screenshot isn't rendering — investigate the build pipeline.
8. **Update** `docs/VIDEO.md` timeline table to match the actual segment durations

**Pitfall — audio not in sync:** If the user reports "audio is not in sync with what
I see in video", the root cause is almost always using a single monolithic `narration.mp3`
with hardcoded timestamps. Switch to per-segment TTS (see "Per-segment TTS generation"
above) where each segment's actual measured duration drives its screenshot display time.

**Pitfall — too much time on one screen:** If the user reports "you lost too much time
on result edit", check that the segment-to-screenshot mapping doesn't assign a
disproportionately long segment to a single screenshot. Split long segments across
two screenshots (e.g., `result-dep-edit.png` + `result-dep-edit-scrolled.png`) to
add visual variety.

**Pitfall — narration describes action but video shows stale state:** The most
common sync failure mode: a narration segment mentions an action (clicking Edit,
opening the MDX editor, scrolling to answers) but the screenshot doesn't show
the result. Every multi-screenshot segment must map sub-screenshots to the exact
narration phrases that describe the visual change:

| Narration phrase | Screenshot transition |
|-----------------|----------------------|
| "...Edit link opens the MDX editor..." | sessions.png → session-edit.png |
| "...answers section breaks down each item" | result-dep-followup.png → result-dep-followup-scrolled.png |
| "...four tabs" | editor.png → editor-fields.png |
| "...browse the assessment library" | dashboard.png → dashboard-assessments.png |

**Rule:** When narration says "clicking X" or "scrolling reveals Y", the video
MUST switch to a screenshot of the result at that moment. If the right screenshot
doesn't exist, add it to `capture-screens.js` and recapture before building.

**Sync verification (mandatory after each build):** Do not rely on visual inspection
alone. Extract frames at the midpoint of each sub-segment and compare with
ImageMagick `compare -metric AE`. Multi-screenshot segments must show >50,000
different pixels between first-half and second-half frames. See
`references/sync-verification.md` for the full script.

```bash
# Quick smoke test: extract mid-subsegment frames and diff them
ffmpeg -y -ss <t_first_half> -i docs/walkthrough-final.mp4 -frames:v 1 /tmp/a.png
ffmpeg -y -ss <t_second_half> -i docs/walkthrough-final.mp4 -frames:v 1 /tmp/b.png
compare -metric AE /tmp/a.png /tmp/b.png /dev/null
# Multi-screenshot: expect >50000. Single-screenshot: expect <1000.
# AE=0 across different sub-segments = broken — investigate immediately.
```

## ffmpeg filter_complex stream mapping

When using `-filter_complex` for overlay (logo intro/outro) alongside an explicit
`-map 0:v:0`, ffmpeg produces **two video streams** in the output — the raw input
stream PLUS the filter graph output. This causes playback issues and bloated files.

**Symptom:** `ffprobe -show_streams out.mp4` shows 2 video streams with different bitrates.

**Fix:** Label the filter graph output with `[outv]` and map it explicitly.
Do NOT use `-map 0:v:0` when a filter_complex produces video output.

```bash
# WRONG — duplicate video streams
ffmpeg -i video.mp4 -i logo.png -i audio.m4a \
  -filter_complex "[1:v]scale=440:-1[logo];[0:v][logo]overlay=...[outv]" \
  -map 0:v:0 -map 2:a:0 out.mp4

# CORRECT — single video stream
ffmpeg -i video.mp4 -i logo.png -i audio.m4a \
  -filter_complex "[1:v]scale=440:-1[logo];[0:v][logo]overlay=...[outv]" \
  -map "[outv]" -map 2:a:0 out.mp4
```

The `templates/build-video.py` already uses the correct mapping. If copying from
an older version, verify the compose step uses `-map "[outv]"`, not `-map 0:v:0`.
