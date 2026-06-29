'use client'

import { useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { showUiLabelsAtom } from '@/lib/state/_atoms'

const UI_PREFIXES = [
  'ui-header',
  'ui-content-section',
  'ui-content-card',
  'ui-content-page',
  'ui-bottom',
]

const COLORS: Record<string, string> = {
  'ui-header': '#f59e0b',
  'ui-content-section': '#3b82f6',
  'ui-content-card': '#10b981',
  'ui-content-page': '#8b5cf6',
  'ui-bottom': '#ef4444',
}

const LABEL_DATA_ATTR = 'data-ui-debug-label'

/** Pick the most specific ui-* class on an element (longest match wins). */
function bestUiClass(el: Element): string | null {
  let best = 'default'
  for (const cls of el.classList) {
    for (const prefix of UI_PREFIXES) {
      if (cls === prefix || cls.startsWith(prefix + '-')) {
        if (cls.length > best.length) best = cls
      }
    }
  }
  return best === 'default' ? null : best
}

function injectLabel(el: Element, cls: string) {
  if (el.querySelector(`[${LABEL_DATA_ATTR}]`)) return

  const prefix = UI_PREFIXES.find((p) => cls === p || cls.startsWith(p + '-')) ?? cls
  const color = COLORS[prefix] ?? '#888'

  const tag = document.createElement('span')
  tag.setAttribute(LABEL_DATA_ATTR, cls)
  tag.textContent = cls
  tag.style.cssText = `
    position: absolute
    top: 2px
    left: 2px
    background: ${color}
    color: #000
    font-size: 10px
    font-weight: 600
    padding: 1px 5px
    border-radius: 3px
    z-index: 99998
    pointer-events: none
    font-family: monospace
    line-height: 1.4
    opacity: 0.85
    white-space: nowrap
  `

  const computed = getComputedStyle(el)
  if (computed.position === 'static') {
    el.setAttribute('data-ui-was-static', '')
    ;(el as HTMLElement).style.position = 'relative'
  }

  el.insertBefore(tag, el.firstChild)
}

function removeAllLabels() {
  document.querySelectorAll(`[${LABEL_DATA_ATTR}]`).forEach((l) => l.remove())
  document.querySelectorAll('[data-ui-was-static]').forEach((el) => {
    ;(el as HTMLElement).style.position = ''
    el.removeAttribute('data-ui-was-static')
  })
}

function labelAll() {
  document.querySelectorAll("[class*='ui-']").forEach((el) => {
    const cls = bestUiClass(el)
    if (cls) injectLabel(el, cls)
  })
}

export const UiLabelsOverlay = () => {
  const show = useAtomValue(showUiLabelsAtom)

  useEffect(() => {
    if (!show) {
      removeAllLabels()
      return
    }

    labelAll()

    const interval = setInterval(labelAll, 600)

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          const cls = bestUiClass(node)
          if (cls) injectLabel(node, cls)
          node.querySelectorAll("[class*='ui-']").forEach((el) => {
            const c = bestUiClass(el)
            if (c) injectLabel(el, c)
          })
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearInterval(interval)
      observer.disconnect()
      removeAllLabels()
    }
  }, [show])

  return null
}