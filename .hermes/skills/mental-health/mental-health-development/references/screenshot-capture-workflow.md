# Screenshot Capture Workflow

## When to use

When the user asks for screenshots of the Hermes Mental Health app running in Microsoft Edge on macOS.

## Prerequisites

- Microsoft Edge installed at `/Applications/Microsoft Edge.app`
- App dev server running at `http://localhost:3000`
- Secondary display (1920x1080) where Edge renders

## Capture method: `screencapture -D2`

Edge renders on display 2. Use `screencapture -o -x -D2 <path>` to capture ONLY the secondary display — no desktop chrome visible.

```bash
screencapture -o -x -D2 /path/to/docs/screenshots/<name>.png
```

## Alternate: region-based capture

If `-D2` isn't working, get Edge window bounds via AppleScript and use `-R`:

```bash
# Get bounds
osascript -e '
tell application "System Events"
  tell process "Microsoft Edge"
    set wPos to position of window 1
    set wSize to size of window 1
    return (item 1 of wPos) & " " & (item 2 of wPos) & " " & (item 1 of wSize) & " " & (item 2 of wSize)
  end tell
end tell
'

# Parse output: "1513 -494 1919 1050"
# Cap y at 0 if negative: h += y; y = 0

# Capture region
screencapture -o -x -R<x>,<y>,<w>,<h> <path>
```

## Scrolling for full-page coverage

For pages with content below the fold, scroll with AppleScript key codes:

```python
# Scroll down (key code 125 = down arrow)
terminal("osascript -e 'tell application \"System Events\" to tell process \"Microsoft Edge\" to key code 125'", timeout=2)

# Scroll up (key code 126 = up arrow)
terminal("osascript -e 'tell application \"System Events\" to tell process \"Microsoft Edge\" to key code 126'", timeout=2)
```

## Capturing modals and interactive states

1. Use `browser_navigate` to load the page
2. Use `browser_click` with the ref ID from the snapshot to open modals
3. Use `terminal` to run `screencapture -D2` after a `sleep` for render time
4. Use `browser_press` with `Escape` key to dismiss modals

**Workflow:**
```python
browser_click(ref='e3')     # Click "Create With AI"
time.sleep(1)
terminal("screencapture -o -x -D2 /path/to/modal.png")
browser_press(key='Escape')  # Dismiss
```

## Capture checklist

For comprehensive docs, capture these states per page:

| Page | Captures |
|------|----------|
| Dashboard | Top (patients), scrolled (assessments), Create With AI modal, New Patient dialog |
| Patient Profile | Top (header + care plan), scrolled (clinical summary/background/consent), edit mode |
| Assessments | Full page with Create Invite + pending list |
| Results | Results list, result detail (chart), result detail edit mode |
| Sessions | Session list, session view (read-only), session edit (MDX editor) |
| Agent Chat | From dashboard context (`?dashboard`), from patient context (`?profile&patientId=`) |
| Editor | Metadata tab, Fields tab, Scoring tab |

## Edge window positioning

If Edge window is partially off-screen (negative y), reposition:

```bash
osascript -e '
tell application "System Events"
  tell process "Microsoft Edge"
    set position of window 1 to {0, 0}
    set size of window 1 to {1920, 1080}
  end tell
end tell
'
```

## Pitfalls

- **AppleScript coordinate parsing:** `item N of wPos` can return commas in the string. Parse with `re.findall(r'-?\d+', output)` instead of split.
- **Negative y bounds:** When window starts above display boundary, cap y at 0 and reduce height.
- **Timing:** Always `sleep` 3-4 seconds after navigation before capturing to allow React rendering.
- **Empty captures:** If PNG file is <10KB, the capture failed (blank/white screen). Retry.
- **Never use full-desktop capture** (`screencapture` without `-D2` or `-R`) — shows macOS dock/menubar/desktop.
