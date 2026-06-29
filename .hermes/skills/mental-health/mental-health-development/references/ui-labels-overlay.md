# UI Labels Debug Overlay

Component: `components/ui-labels-overlay.tsx`
State: `showUiLabelsAtom` in `lib/state/_atoms.ts` (atomWithStorage)
Checkbox: `components/app-nav.tsx` — label before GitHub link
Mount: `app/layout.tsx` inside `<Providers>` after `{children}`

## How it works

The overlay injects `<span>` labels as `position: absolute` children of each DOM element with a `ui-*` semantic class. Labels are NOT React-rendered — they use raw DOM manipulation for performance and to avoid re-render cascades.

### Subsection class selection (prefix matching)

Elements carry both a base class AND a subsection-qualified variant (e.g., `ui-content-section ui-content-section-patients`). The overlay shows the **most specific** matching class — `bestUiClass()` picks the longest class name matching any ui- prefix:

```ts
const UI_PREFIXES = [
  "ui-header", "ui-content-section", "ui-content-card",
  "ui-content-page", "ui-bottom",
];

function bestUiClass(el: Element): string | null {
  let best = "";
  for (const cls of el.classList) {
    for (const prefix of UI_PREFIXES) {
      if (cls === prefix || cls.startsWith(prefix + "-")) {
        if (cls.length > best.length) best = cls;
      }
    }
  }
  return best || null;
}
```

This means `ui-content-section-patients` wins over `ui-content-section` (longer), and `ui-header-dashboard` wins over `ui-header`. Cards show just `ui-content-card` since they don't carry subsection variants.

### Colors

Colors are mapped by PREFIX (not specific class), so all variants get the same color:

| Prefix | Color | Hex |
|---|---|---|
| `ui-header` | Amber | `#f59e0b` |
| `ui-content-section` | Blue | `#3b82f6` |
| `ui-content-card` | Emerald | `#10b981` |
| `ui-content-page` | Violet | `#8b5cf6` |
| `ui-bottom` | Red | `#ef4444` |

### Label injection

```ts
function injectLabel(el: Element, cls: string) {
  // Skip if already labeled
  if (el.querySelector(`[${LABEL_DATA_ATTR}]`)) return;

  const prefix = UI_PREFIXES.find(p => cls === p || cls.startsWith(p + "-")) ?? cls;
  const color = COLORS[prefix] ?? "#888";

  const tag = document.createElement("span");
  tag.setAttribute(LABEL_DATA_ATTR, cls);
  tag.textContent = cls;

  // position: absolute so it scrolls with the element (NOT fixed)
  tag.style.cssText = `
    position: absolute; top: 2px; left: 2px;
    background: ${color}; color: #000;
    font-size: 10px; font-weight: 600;
    padding: 1px 5px; border-radius: 3px;
    z-index: 99998; pointer-events: none;
    font-family: monospace; line-height: 1.4;
    opacity: 0.85; white-space: nowrap;
  `;

  // Force relative positioning if parent is static
  const computed = getComputedStyle(el);
  if (computed.position === "static") {
    el.setAttribute("data-ui-was-static", "");
    (el as HTMLElement).style.position = "relative";
  }

  el.insertBefore(tag, el.firstChild);
}
```

### Element discovery

Instead of iterating per known class (`UI_CLASSES.forEach` + `document.querySelectorAll`), the overlay uses a single `document.querySelectorAll("[class*='ui-']")` which catches ALL elements with any ui- class, including subsection variants. Each element is then inspected with `bestUiClass()` to determine the specific label text and color.

```ts
function labelAll() {
  document.querySelectorAll("[class*='ui-']").forEach(el => {
    const cls = bestUiClass(el);
    if (cls) injectLabel(el, cls);
  });
}
```

### Cleanup on uncheck

```ts
function removeAllLabels() {
  document.querySelectorAll(`[${LABEL_DATA_ATTR}]`).forEach(l => l.remove());
  document.querySelectorAll("[data-ui-was-static]").forEach(el => {
    (el as HTMLElement).style.position = "";
    el.removeAttribute("data-ui-was-static");
  });
}
```

### SPA navigation support

Two mechanisms catch DOM changes:
1. **`MutationObserver`** on `document.body` (childList + subtree) — catches most route changes. Mutations are inspected for added nodes that carry `ui-*` classes or contain children with them.
2. **`setInterval(600ms)`** — catches Next.js full tree replacements where the observer misses elements

Both are cleaned up in the `useEffect` return.

## Pitfalls

- **Never use `position: fixed`** for scroll-bound labels. `getBoundingClientRect()` only gives viewport coordinates which go stale on scroll. Use `position: absolute` as a child of the target element — labels naturally scroll with their parent.
- **Restore `position: static` on cleanup.** Forcing `position: relative` on elements can break layouts if not restored.
- **Don't use React state for label positions.** DOM injection avoids re-render cascades across the entire app.
- **Unchecking must fully remove labels.** The `useEffect` cleanup calls `removeAllLabels()` when `show` goes false. The MutationObserver and interval are disconnected. No stale labels remain.