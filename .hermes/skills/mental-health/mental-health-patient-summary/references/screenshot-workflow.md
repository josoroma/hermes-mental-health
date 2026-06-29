# Screenshot Workflow for Documentation

Production-proven screenshot capture workflow for the Hermes Mental Health docs.

## Display Setup

This project runs on a dual-display Mac (built-in Retina + external 1080p FHD). Screenshots are captured from Microsoft Edge on the secondary display.

### Capture command

```bash
screencapture -o -x -D2 docs/screenshots/<name>.png
```

- `-D2` captures the secondary display only (no desktop/OS chrome from main display)
- `-o` disables window shadows
- `-x` disables sound

### Browser

Microsoft Edge is the preferred browser for screenshots. It opens reliably via `open -a "Microsoft Edge"` and responds to AppleScript for scrolling and clicks.

### Navigation between screenshots

```bash
open -a "Microsoft Edge" "http://localhost:3000/<route>"
sleep 4  # wait for page load
```

## Per-Page Screenshot Strategy

For content below the fold, use multiple screenshots with scrolling:

```bash
# Capture top of page
open -a "Microsoft Edge" "http://localhost:3000/patients/<id>"
sleep 4
screencapture -o -x -D2 docs/screenshots/patient-profile.png

# Scroll down and capture bottom
osascript -e 'tell application "System Events" to tell process "Microsoft Edge" to key code 125'
sleep 1
screencapture -o -x -D2 docs/screenshots/patient-profile-clinical.png
```

Key code reference:
- 125 = Arrow Down (small scroll)
- 121 = Page Down (large scroll)
- 115 = Home (scroll to top)

## Interactive Screenshots

For modals, edit mode, and nested pages:

1. Use `browser_navigate` to load the page
2. Use `browser_click` to open modals or toggle edit mode
3. Use `terminal()` with `screencapture -D2` to capture
4. Use `browser_press` with Escape to close modals

```bash
# Capture Create With AI modal
browser_click ref="e3"       # click "Create With AI" button
sleep 1
screencapture -o -x -D2 docs/screenshots/dashboard-create-ai.png

# Close and capture New Patient dialog
browser_press key="Escape"
browser_click ref="e10"      # click "New Patient" button
sleep 1
screencapture -o -x -D2 docs/screenshots/dashboard-new-patient.png
```

## Screenshot Checklist

| Page | Screenshots | Technique |
|------|------------|-----------|
| Dashboard | `dashboard.png`, `dashboard-assessments.png` | Top + scroll down 4× Page Down |
| Dashboard | `dashboard-create-ai.png` | Click Create With AI button + capture |
| Patient Profile | `patient-profile.png`, `patient-profile-clinical.png` | Top + scroll down 6× |
| Assessments | `assessments.png` | Navigate + capture |
| Results | `results.png` | Navigate + capture |
| Result Detail | `result-detail.png`, `result-detail-edit.png` | Navigate + click Edit |
| Sessions | `sessions.png` | Navigate + capture |
| Session Edit | `session-edit.png` | Navigate to edit route directly |
| Notes | `notes.png` | Navigate to `/patients/<id>/notes` |
| Agent Chat | `agent-chat.png`, `agent-chat-patient.png` | Navigate with query params |
| Editor | `editor.png`, `editor-fields.png`, `editor-scoring.png` | Navigate + click tabs |

## Embedding in Markdown Docs

Use `## Page Screenshots` section with `![](screenshots/...)` syntax and descriptive captions:

```markdown
## Page Screenshots

### Results List

![](screenshots/results.png)

*Results list page — 7 assessment results sorted by date, each showing measure name, scores, and severity badge.*

### Result Detail — Edit Mode

![](screenshots/result-detail-edit.png)

*Result in edit mode — each item becomes an editable scale control. Practitioners can correct responses and save to re-score.*
```

Keep captions specific — describe what the viewer should notice, not generic "page showing X."