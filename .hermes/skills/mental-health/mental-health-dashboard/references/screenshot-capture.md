# macOS Screenshot Capture — Browser Region Only

When capturing screenshots for documentation, always capture the browser region only — never the full desktop. Desktop chrome (wallpaper, other windows, menu bar) distracts viewers and looks unprofessional.

## Setup

The Hermes app renders the browser on a secondary display. Microsoft Edge is opened on that display.

## Quick Capture (Display-Level)

When Edge fills the entire secondary display, use `screencapture` targeting that display:

```bash
# Capture display 2 (secondary display)
screencapture -o -x -D2 docs/screenshots/<name>.png
```

Flags:
- `-o` — no window shadow
- `-x` — no sound effect
- `-D2` — capture display 2 (secondary display)

## Verify Display Setup

```bash
# Check display configuration
system_profiler SPDisplaysDataType | grep -E "Resolution|Main Display"

# List AVFoundation devices (for ffmpeg recording)
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | head -10
```

## Browser Navigation Script

```python
from hermes_tools import terminal
import time

def nav(url):
    terminal(f'open -a "Microsoft Edge" "{url}"', timeout=5)
    time.sleep(4)  # wait for page load

def scroll_down(n=1):
    for _ in range(n):
        terminal('osascript -e \'tell application "System Events" to tell process "Microsoft Edge" to key code 121\'', timeout=2)
        time.sleep(0.4)

def capture(name):
    terminal(f'screencapture -o -x -D2 docs/screenshots/{name}', timeout=5)
```

## Multi-Section Pages

For pages with content below the fold (dashboard assessments, patient clinical cards), take two screenshots:
1. Top of page
2. After scrolling down (Page Down key code 121, ~4-6 presses)

## Pitfall: Window Region Capture

`-R` region capture requires exact browser window bounds. On multi-display setups with negative coordinates, this often clips the top of the window. `-D2` display-level capture is simpler and more reliable.
