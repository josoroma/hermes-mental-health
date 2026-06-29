# Docs Generation Workflow

## Page Documentation Structure

Each page doc in `docs/` follows this structure:

```markdown
# Page Title

**Route:** `/route/path`
**Component:** `path/to/component.tsx`

Description paragraph.

---

## Page Screenshots

![](screenshots/filename.png)

*Caption describing the screenshot.*

---

## Layout (ASCII diagram)
...

## Features (subsections per feature)
...

## Key Files
| File | Role |
|------|------|
...
```

## Screenshot Guidelines

- Capture using Microsoft Edge on secondary display
- Use `screencapture -o -x -D2` for display-level capture
- For long pages: capture top + scrolled versions (use Page Down key code 121)
- Wait 3-4 seconds after navigation for page load
- All screenshots go in `docs/screenshots/`
- Embed with `![](screenshots/filename.png)` in markdown

## Navigation Links

Every docs page must have prev/next navigation at the bottom:

```markdown
---

← [previous-page](previous-page.md) | [next-page](next-page.md) →
```

Full page order: index → SPECS → dashboard → patient-profile → assessments → results → sessions → notes → agent-chat → editor → assessment-form → VIDEO

## Batch Update Script

```bash
cd docs
pages=("index.md" "SPECS.md" "dashboard.md" "patient-profile.md" "assessments.md" "results.md" "sessions.md" "notes.md" "agent-chat.md" "editor.md" "assessment-form.md" "VIDEO.md")
for i in "${!pages[@]}"; do
  f="${pages[$i]}"
  prev_i=$((i-1))
  next_i=$((i+1))
  sed -i '' '/^← /d' "$f" 2>/dev/null
  sed -i '' '/^|.*→$/d' "$f" 2>/dev/null
  prev_name="${pages[$prev_i]%.md}"
  next_name="${pages[$next_i]%.md}"
  if [ $i -gt 0 ] && [ $i -lt $((${#pages[@]}-1)) ]; then
    echo -e "\n---\n\n← [${prev_name}](${pages[$prev_i]}) | [${next_name}](${pages[$next_i]}) →" >> "$f"
  elif [ $i -eq 0 ]; then
    echo -e "\n---\n\n[${next_name}](${pages[$next_i]}) →" >> "$f"
  else
    echo -e "\n---\n\n← [${prev_name}](${pages[$prev_i]})" >> "$f"
  fi
done
```

## Logo

Place `docs/logo.png` and embed at top of `docs/index.md` and `README.md`:

```markdown
![](logo.png)
```

```markdown
![](docs/logo.png)
```