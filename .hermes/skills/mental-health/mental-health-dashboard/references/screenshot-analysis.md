# Screenshot Analysis for UI Debugging

When the built-in vision analyzer fails on a screenshot (PNG from Hermes composer-images), fall back to programmatic pixel analysis.

## Quick OCR

```bash
tesseract <image.png> stdout 2>/dev/null
```

Extracts visible text. Works best on UI screenshots with clear typography.

## Pixel-level inspection (Python + PIL)

```python
from PIL import Image
from collections import Counter

img = Image.open("screenshot.png")
w, h = img.size
pixels = img.load()

# Detect active tab by background color elevation
for name, xs, xe in [("Profile", 60, 200), ("Assessments", 260, 400), ("Results", 450, 600)]:
    bg_colors = []
    for x in range(xs, xe):
        r, g, b, a = pixels[x, y]
        if (r + g + b) // 3 < 80:  # exclude text pixels
            bg_colors.append((r, g, b))
    top = Counter(bg_colors).most_common(1)[0]
    print(f"{name}: dominant bg = #{top[0][0]:02x}{top[0][1]:02x}{top[0][2]:02x}")
```

## Vertical text scan for finding text baselines

```python
# Determine which y-rows contain text for each tab area
for name, x_center in [("Profile", 110), ("Assessments", 310), ("Results", 520)]:
    for y in range(130, 150):
        for dx in [-15, -10, -5, 0, 5, 10, 15]:
            r, g, b, a = pixels[x_center + dx, y]
            if (r + g + b) // 3 > 100:
                print(f"{name}: text at y={y}")
                break
```

Useful for locating exactly which rows carry the tab label text vs badge numbers.

## ImageMagick fallback (when PIL is unavailable)

```bash
# Single-row pixel dump
convert image.png -crop Wx1+0+Y txt:- 2>/dev/null | head -5

# Full pixel enumeration in text format
convert image.png txt:- 2>/dev/null | grep -E '^[0-9]'
```

`convert` ships with ImageMagick (`brew install imagemagick`). The `txt:-` output format is `x,y: (r,g,b,a)  #HEX  comment` — parsable with basic awk/sed.

## Patterns observed

- **Active tab** (shadcn luma dark): background `#181c24` (elevated from base `#090B0F`)
- **Inactive tab**: background `#151920` (base dark surface)
- **Active tab text**: brightness ~226 (white)
- **Inactive tab text**: brightness ~112-120 (dimmed grey)
- **Page background**: `#090B0F` (deepest dark)

## ASCII rendering for layout

```python
for y in range(0, h, 2):
    line = ""
    for x in range(0, w, 3):
        bright = (pixels[x,y][0] + pixels[x,y][1] + pixels[x,y][2]) // 3
        line += "#" if bright > 200 else "+" if bright > 150 else "." if bright > 100 else ":" if bright > 40 else " "
    print(f"{y:3d}|{line}|")
```

Produces a quick structural view of the UI layout showing headers, tab bars, and content regions.