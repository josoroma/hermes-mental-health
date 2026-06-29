---
name: mental-health-video
description: Create narrated walkthrough videos and screencasts for the Hermes Mental Health practitioner tutorial. Record, narrate, and publish to GitHub Pages.
version: 0.1.0
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

## Workflow

1. **Prepare the app** — start dev server (`npm run dev`), seed demo patient data, stage scenarios
2. **Write narration** — save English script to `docs/narration.txt`, keep it under 3,500 characters for ~3-minute runtime
3. **Generate TTS** — `edge-tts` with `en-US-JennyNeural` voice, rate +3%, pitch +2Hz → `docs/narration.mp3`
4. **Record** — `ffmpeg -f avfoundation -video_device_index 2` on secondary display, 220s, 1920×1080 libx264
5. **Orchestrate** — `execute_code()` AppleScript browser control: `open -a "Microsoft Edge"`, Page Down key code 121, Home key code 115, `click at {x, y}` for buttons
6. **Compose** — logo overlay first 3s + last 3s, padded narration with 3s silence at each end, `-shortest`
7. **Output** — `docs/walkthrough-final.mp4` (30 fps, libx264, AAC 192kbps)

Full pipeline documentation: see `video-walkthrough-recording` skill and `docs/VIDEO.md`.

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

## Narration language

All narration is in English. The practitioner audience is English-speaking.
Technical terms (PHQ-9, DSM-5-TR, PROMIS, T-score) are used as-is.

## Publishing

Publish to a fresh GitHub repo (no legacy code), README with GitHub Pages link.
Repository should expose only the tutorial site, never the project source code.