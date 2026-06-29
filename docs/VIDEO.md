# Hermes Mental Health — Video Walkthrough

**File:** `docs/walkthrough-final.mp4`  
**Duration:** 3:14 (194 seconds)  
**Resolution:** 1920×1080 (30 fps, H.264)  
**Narrator:** en-US-JennyNeural (female, friendly, professional)  
**Audio:** AAC 192 kbps  
**Logo:** `docs/logo.png` — Hermes Mental Health logo, shown at intro (0–3s) and outro (last 3s)

---

## Walkthrough Sequence

| Time | Page | Content | Duration |
|------|------|---------|----------|
| 0:00 | Logo | Hermes Mental Health logo on black | 3s |
| 0:03 | Dashboard | Patients table — Carlos Ramírez, Ana Vega, josoroma | 6.6s |
| 0:10 | Dashboard | Patients + Custom/Available Assessments (68 measures) | 18.3s |
| 0:28 | Patient Profile | josoroma — gradient header, Care Plan | 18.0s |
| 0:46 | Patient Profile | Clinical Summary, Clinical Background, Consent | 15.1s |
| 1:01 | Assessments | Invite lifecycle, pending invites | 13.4s |
| 1:14 | Assessment Form | Patient-facing form — radio buttons, text areas | 14.1s |
| 1:29 | Results | Results list with scored assessments | 12.3s |
| 1:41 | Result Detail | T-score gauge chart, scores card, item answers | 21.1s |
| 2:02 | Result Edit | Inline edit mode — radio buttons, re-score | 19.5s |
| 2:21 | Sessions | Session list with entries | 16.9s |
| 2:38 | Agent Chat | Chat interface with audit buttons | 10.0s |
| 2:48 | Editor | Assessment Editor — metadata, fields, scoring | 7.9s |
| 2:56 | Dashboard | Closing — file-backed data, dark-mode UI | 14.8s |
| 3:11 | Logo | Hermes Mental Health logo on black | 3s |

---

## Production Pipeline

1. **Script** — `docs/narration.txt` (2,945 chars, English)
2. **Screenshots** — `docs/screenshots/*.png` (1920×1080, captured via Edge on display 2)
3. **TTS** — Microsoft edge-tts, voice `en-US-JennyNeural`, rate +3%, pitch +2Hz
4. **Compose** — screenshot slideshow timed to narration segments, logo overlay for first 3s and last 3s

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

# Build video from screenshots + narration
python3 docs/build-video.py
```

---

## Browser Control

Screenshots are captured from Microsoft Edge on display 2 using `screencapture -o -x -D2`.
The `docs/build-video.py` script assembles them into a timed slideshow matching the narration.

---

## Files

```
docs/
  narration.txt          — Full script (English)
  narration.mp3          — TTS audio (edge-tts, JennyNeural)
  build-video.py         — Screenshot-to-video pipeline
  walkthrough-final.mp4  — Composed video with narration
  VIDEO.md               — This file
```
---

← [assessment-form](assessment-form.md)
