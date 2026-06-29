# Hermes Mental Health — Video Walkthrough

**File:** `docs/walkthrough-final.mp4`  
**Duration:** 3:32 (212 seconds)  
**Resolution:** 1920×1080 (30 fps, H.264)  
**Narrator:** en-US-JennyNeural (female, friendly, professional)  
**Audio:** AAC 192 kbps  
**Logo:** `docs/logo.png` — Hermes Mental Health logo, shown at intro (0–3s) and outro (last 3s)

---

## Walkthrough Sequence

| Time | Page | Content |
|------|------|---------|
| 0:00 | Dashboard | Patient table, assessment library, Create With AI |
| 0:25 | Patient Profile | Gradient header, Care Plan, Clinical Summary (scrolled) |
| 0:45 | Assessments | Create Invite, pending invites, Taken log |
| 1:05 | Results | Results list with 7 scored assessments |
| 1:25 | Result Detail | T-score gauge chart, scores card, item answers |
| 1:45 | Result Edit | Inline edit mode — toggle fields, re-score |
| 2:00 | Sessions | Session list with 3 entries |
| 2:20 | Session Edit | MDX editor with formatting toolbar |
| 2:40 | Agent Chat | Chat interface with Care Plan, Session Note, Progress, Safety buttons |
| 3:00 | Editor | Metadata, Fields, Scoring tabs |
| 3:20 | Dashboard | Return to dashboard |

---

## Production Pipeline

1. **Script** — `docs/narration.txt` (3,339 chars, English)
2. **Logo** — `docs/logo.png` (880×1168, centered on black intro/outro)
3. **TTS** — Microsoft edge-tts, voice `en-US-JennyNeural`, rate +3%, pitch +2Hz
4. **Record** — ffmpeg AVFoundation capture of display 2, 30 fps H.264 via VideoToolbox, 220 seconds
5. **Compose** — logo overlay for first 3s and last 3s, merge with padded narration

### Commands

```bash
# Generate TTS
.venv/bin/python3 << 'PYEOF'
import asyncio, edge_tts
with open("docs/narration.txt") as f: script = f.read()
async def main():
    communicate = edge_tts.Communicate(script, "en-US-JennyNeural", rate="+3%", pitch="+2Hz")
    await communicate.save("docs/narration.mp3")
asyncio.run(main())
PYEOF

# Record display 2
ffmpeg -f avfoundation -framerate 30 -video_device_index 2 -i "none:" \
  -t 220 -vf "scale=1920:1080,format=yuv420p" -c:v libx264 -preset ultrafast -crf 18 \
  -y docs/screen-recording.mp4

# Pad narration with 3s silence at start and end
ffmpeg -f lavfi -i "anullsrc=r=24000:cl=mono" -t 3 -c:a aac -b:a 192k -y docs/silence.m4a
ffmpeg -i docs/silence.m4a -i docs/narration.mp3 -i docs/silence.m4a \
  -filter_complex "[0:a][1:a][2:a]concat=n=3:v=0:a=1" -c:a aac -b:a 192k \
  -y docs/narration-padded.m4a

# Compose with logo at intro/outro
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 docs/screen-recording.mp4)
LAST_START=$(echo "$DUR - 3" | bc)
ffmpeg -i docs/screen-recording.mp4 -i docs/logo.png -i docs/narration-padded.m4a \
  -filter_complex "[1:v]scale=440:-1[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2:enable='between(t,0,3)+between(t,${LAST_START},${DUR})'" \
  -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k \
  -shortest -map 0:v:0 -map 2:a:0 \
  -y docs/walkthrough-final.mp4
```

---

## Browser Control

The walkthrough used AppleScript keyboard events to control Microsoft Edge during recording:

| Action | Key Code | AppleScript |
|--------|----------|-------------|
| Page Down (scroll) | 121 | `key code 121` |
| Home (scroll top) | 115 | `key code 115` |
| Click at (x,y) | — | `click at {x, y}` |

Edge was opened on display 2 (secondary) and zoom was reset to 100% via `View → Actual Size` menu before recording.

---

## Files

```
docs/
  narration.txt          — Full script (English)
  narration.mp3          — TTS audio (edge-tts, JennyNeural)
  walkthrough-final.mp4  — Composed video with narration
  VIDEO.md               — This file
```